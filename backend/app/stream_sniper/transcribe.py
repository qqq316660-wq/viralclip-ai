"""
NVIDIA NeMo Parakeet-TDT 0.6B ASR Engine - PeakCut Architecture
Transcribes with 12-24s quiet-moment chunking, sub-second latency on CPU.
"""
from __future__ import annotations

import os
import threading
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

import numpy as np

from . import config

_lock = threading.Lock()
_recognizer = None

def is_model_ready() -> bool:
    if not config.MODEL_DIR.is_dir():
        return False
    enc = list(config.MODEL_DIR.glob("encoder*.onnx"))
    tokens = config.MODEL_DIR / "tokens.txt"
    return bool(enc and tokens.is_file())


def get_recognizer():
    global _recognizer
    if _recognizer is not None:
        return _recognizer

    with _lock:
        if _recognizer is not None:
            return _recognizer

        import sherpa_onnx

        encoder_file = next(config.MODEL_DIR.glob("encoder*.onnx"), None)
        decoder_file = next(config.MODEL_DIR.glob("decoder*.onnx"), None)
        joiner_file = next(config.MODEL_DIR.glob("joiner*.onnx"), None)
        tokens_file = config.MODEL_DIR / "tokens.txt"

        if not all([encoder_file, decoder_file, joiner_file, tokens_file.is_file()]):
            raise RuntimeError(f"Missing model files in {config.MODEL_DIR}")

        cpus = os.cpu_count() or 4
        threads = max(2, min(6, cpus - 1))

        _recognizer = sherpa_onnx.OfflineRecognizer.from_transducer(
            encoder=str(encoder_file),
            decoder=str(decoder_file),
            joiner=str(joiner_file),
            tokens=str(tokens_file),
            num_threads=threads,
            sample_rate=16000,
            feature_dim=80,
            decoding_method="greedy_search",
            model_type="nemo_transducer",
        )
        return _recognizer


def _split_quiet_chunks(audio: np.ndarray, lo: float = 12.0, hi: float = 24.0, sr: int = 16000):
    """Split at quiet moments between lo and hi seconds so words are not cut in half."""
    hop = 800  # 50 ms frames
    n = len(audio)
    frames = n // hop
    if frames == 0:
        if n > 0:
            yield 0, n
        return
    x = audio[: frames * hop].reshape(frames, hop).astype(np.float32)
    rms = np.sqrt((x ** 2).mean(axis=1))
    pos = 0
    while pos < n:
        if n - pos <= hi * sr:
            yield pos, n
            return
        a = (pos + int(lo * sr)) // hop
        b = (pos + int(hi * sr)) // hop
        if a >= frames or a >= b:
            yield pos, min(n, pos + int(hi * sr))
            pos += int(hi * sr)
            continue
        cut = (a + int(np.argmin(rms[a:b]))) * hop + hop // 2
        yield pos, cut
        pos = cut


def _tokens_to_words(tokens: List[str], timestamps: List[float], offset_sec: float = 0.0) -> List[Dict]:
    """Converts SentencePiece tokens to [{'w': word, 's': start_sec, 'e': end_sec}]"""
    out = []
    cur, gap = None, False
    for tok, t in zip(tokens, timestamps):
        new_word = tok.startswith((" ", "▁")) or gap
        piece = tok.replace("▁", " ").strip()
        if not piece:
            gap = True
            continue
        gap = False
        is_punct = all(not c.isalnum() for c in piece)
        if cur is None or (new_word and not is_punct):
            if cur:
                out.append(cur)
            cur = {"w": piece, "s": round(offset_sec + t, 2), "e": round(offset_sec + t + 0.28, 2)}
        else:
            cur["w"] += piece
            cur["e"] = round(offset_sec + t + 0.20, 2)
    if cur:
        out.append(cur)

    # Sanitize bounds
    for i in range(len(out) - 1):
        out[i]["e"] = max(out[i]["s"] + 0.05, min(out[i]["e"], out[i + 1]["s"]))
    return out


def transcribe(audio_input: Any, offset_sec: float = 0.0) -> List[Dict]:
    """
    Transcribes audio into PeakCut format: [{'w': word, 's': start_sec, 'e': end_sec}, ...]
    Accepts: .wav file path, float32 ndarray, or int16 PCM bytes.
    """
    rec = get_recognizer()

    if isinstance(audio_input, (str, Path)):
        import soundfile as sf
        samples, sr = sf.read(str(audio_input), dtype="float32")
    elif isinstance(audio_input, np.ndarray):
        sr = 16000
        if audio_input.dtype == np.int16:
            samples = audio_input.astype(np.float32) / 32768.0
        else:
            samples = audio_input.astype(np.float32)
    elif isinstance(audio_input, (bytes, bytearray)):
        sr = 16000
        arr = np.frombuffer(audio_input, dtype=np.int16)
        samples = arr.astype(np.float32) / 32768.0
    else:
        raise ValueError("Unsupported audio format")

    total_sec = len(samples) / sr
    words = []

    if total_sec > 25.0:
        for a_idx, b_idx in _split_quiet_chunks(samples, lo=12.0, hi=24.0, sr=sr):
            seg = samples[a_idx:b_idx]
            if len(seg) < 4800 or float(np.sqrt((seg ** 2).mean())) < 0.003:
                continue  # skip pure silence

            stream = rec.create_stream()
            stream.accept_waveform(sr, seg)
            rec.decode_stream(stream)

            toks = list(stream.result.tokens)
            stamps = [float(t) for t in stream.result.timestamps]
            seg_off = offset_sec + (a_idx / sr)
            words.extend(_tokens_to_words(toks, stamps, offset_sec=seg_off))
    else:
        stream = rec.create_stream()
        stream.accept_waveform(sr, samples)
        rec.decode_stream(stream)
        toks = list(stream.result.tokens)
        stamps = [float(t) for t in stream.result.timestamps]
        words = _tokens_to_words(toks, stamps, offset_sec=offset_sec)

    return words
