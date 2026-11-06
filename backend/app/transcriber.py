from pathlib import Path
from typing import Callable, Dict, List, Optional
from faster_whisper import WhisperModel

from app.config import DEVICE, COMPUTE_TYPE, DEFAULT_WHISPER_MODEL

_model_instance = None

def get_whisper_model(model_size: str = DEFAULT_WHISPER_MODEL, device: str = DEVICE) -> WhisperModel:
    global _model_instance
    if _model_instance is None:
        compute_type = "float16" if device == "cuda" else "int8"
        _model_instance = WhisperModel(model_size, device=device, compute_type=compute_type)
    return _model_instance

def transcribe_audio(
    audio_path: Path,
    progress_callback: Optional[Callable[[float, str], None]] = None,
    device: Optional[str] = None
) -> Dict:
    """
    Transcribes audio file using faster-whisper, generating words with millisecond timestamps.
    """
    model = get_whisper_model(device=device or DEVICE)
    
    if progress_callback:
        progress_callback(10.0, "Starting AI Whisper transcription...")

    segments, info = model.transcribe(
        str(audio_path),
        beam_size=5,
        word_timestamps=True,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500)
    )

    result_segments = []
    all_words = []
    
    total_duration = info.duration or 1.0

    for seg in segments:
        words = []
        if seg.words:
            for w in seg.words:
                words.append({
                    "word": w.word.strip(),
                    "start": round(w.start, 3),
                    "end": round(w.end, 3),
                    "probability": round(w.probability, 3)
                })
                all_words.append({
                    "word": w.word.strip(),
                    "start": round(w.start, 3),
                    "end": round(w.end, 3)
                })

        result_segments.append({
            "id": seg.id,
            "start": round(seg.start, 3),
            "end": round(seg.end, 3),
            "text": seg.text.strip(),
            "words": words
        })

        if progress_callback and total_duration > 0:
            current_pct = min(95.0, 10.0 + (seg.end / total_duration) * 85.0)
            progress_callback(current_pct, f"Transcribed {seg.end:.1f}s / {total_duration:.1f}s")

    if progress_callback:
        progress_callback(100.0, "Transcription completed")

    return {
        "language": info.language,
        "language_probability": info.language_probability,
        "duration": info.duration,
        "segments": result_segments,
        "words": all_words
    }
