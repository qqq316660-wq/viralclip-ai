"""Dual-mode Stream Sniper Session manager: Live rolling buffer sniper + Deep VOD chunked scanner."""
import collections
import json
import logging
import os
import re
import shutil
import socket
import ssl
import subprocess
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import numpy as np

logger = logging.getLogger(__name__)

from . import brain, config, facecam, games, media, render, roman, transcribe

SEG_SEC = 6
SR = 16000
PAD = 8

LIVE_SESSION: Optional["LiveSniperSession"] = None
VOD_SESSION: Optional["VODSniperSession"] = None


def get_clips_registry() -> List[Dict[str, Any]]:
    f = config.CLIPS_DIR / "registry.json"
    if not f.exists():
        return []
    try:
        return json.loads(f.read_text(encoding="utf-8"))
    except Exception:
        return []


def save_clip_to_registry(clip_data: Dict[str, Any]):
    config.CLIPS_DIR.mkdir(parents=True, exist_ok=True)
    f = config.CLIPS_DIR / "registry.json"
    clips = get_clips_registry()
    clips = [c for c in clips if c.get("id") != clip_data.get("id")]
    clips.insert(0, clip_data)
    f.write_text(json.dumps(clips, indent=2), encoding="utf-8")


def delete_clip_from_registry(clip_id: str) -> bool:
    f = config.CLIPS_DIR / "registry.json"
    clips = get_clips_registry()
    initial_len = len(clips)
    clips = [c for c in clips if c.get("id") != clip_id]
    f.write_text(json.dumps(clips, indent=2), encoding="utf-8")

    # Delete physical files
    for ext in ("mp4", "jpg", "ass"):
        p = config.CLIPS_DIR / f"{clip_id}.{ext}"
        try:
            p.unlink(missing_ok=True)
        except Exception:
            pass

    global VOD_SESSION
    if VOD_SESSION and hasattr(VOD_SESSION, "clips"):
        VOD_SESSION.clips = [c for c in VOD_SESSION.clips if c.get("id") != clip_id]

    return len(clips) < initial_len


def clear_clips_registry(filter_type: str = "all") -> int:
    f = config.CLIPS_DIR / "registry.json"
    clips = get_clips_registry()
    to_delete = []
    to_keep = []

    for c in clips:
        cid = str(c.get("id", ""))
        if filter_type == "vod" and cid.startswith("vod_"):
            to_delete.append(c)
        elif filter_type == "live" and cid.startswith("sniper_"):
            to_delete.append(c)
        elif filter_type == "all":
            to_delete.append(c)
        else:
            to_keep.append(c)

    f.write_text(json.dumps(to_keep, indent=2), encoding="utf-8")

    for c in to_delete:
        cid = str(c.get("id", ""))
        for ext in ("mp4", "jpg", "ass"):
            p = config.CLIPS_DIR / f"{cid}.{ext}"
            try:
                p.unlink(missing_ok=True)
            except Exception:
                pass

    global VOD_SESSION
    if VOD_SESSION and hasattr(VOD_SESSION, "clips") and filter_type in ("all", "vod"):
        VOD_SESSION.clips = []

    return len(to_delete)


def compress_audio_for_remote(audio_path: Path) -> Path:
    """Converts a bulky 57MB+ WAV to a compact 32kbps mono MP3 (~7MB) in ~1s to prevent socket write timeouts."""
    if audio_path.suffix.lower() == ".mp3":
        return audio_path
    mp3_path = audio_path.with_suffix(".mp3")
    if mp3_path.exists() and mp3_path.stat().st_size > 1000:
        return mp3_path
    try:
        media.run(["ffmpeg", "-y", "-v", "error", "-i", str(audio_path), "-vn", "-ac", "1", "-ar", "16000", "-b:a", "32k", str(mp3_path)], timeout=30)
        if mp3_path.exists() and mp3_path.stat().st_size > 1000:
            return mp3_path
    except Exception as e:
        logger.warning(f"Audio compression failed ({e}), using original: {audio_path}")
    return audio_path


def transcribe_remote_kaggle(
    audio_path: Path,
    kaggle_url: str,
    cancel_check=None,
    job_id_callback=None,
    known_job_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Submits audio slice to remote Kaggle GPU Whisper Large-V3 server and polls result."""
    import requests
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry

    endpoint = kaggle_url.rstrip("/") + "/transcribe"
    status_base = kaggle_url.rstrip("/") + "/status"

    session = requests.Session()
    retries = Retry(total=3, backoff_factor=1.5, status_forcelist=[500, 502, 503, 504])
    session.mount("https://", HTTPAdapter(max_retries=retries))
    session.mount("http://", HTTPAdapter(max_retries=retries))

    # Fast Path 0: Warmup ping to revive/verify Cloudflare tunnel route
    try:
        session.get(kaggle_url.rstrip("/"), timeout=10)
    except Exception:
        pass

    # Fast Path 1: Check if known_job_id is already completed on Kaggle GPU!
    if known_job_id:
        try:
            resp = session.get(f"{status_base}/{known_job_id}", timeout=10)
            if resp.status_code == 200:
                st = resp.json()
                if st.get("status") == "completed":
                    result = st.get("result", {})
                    words = _extract_words_from_whisper(result)
                    if words:
                        return words
        except Exception:
            pass

    # Fast Path 2: Compress bulky WAV (57MB) to 32kbps MP3 (~7MB) in ~1s so upload is ultra-fast
    upload_file = compress_audio_for_remote(audio_path)
    content_type = "audio/mpeg" if upload_file.suffix.lower() == ".mp3" else "audio/wav"

    job_id = None
    upload_attempts = 0
    max_upload_attempts = 3
    r = None
    last_err = None

    while upload_attempts < max_upload_attempts:
        if cancel_check and cancel_check():
            raise RuntimeError("Chunk transcription cancelled by user.")
        upload_attempts += 1
        try:
            # Stream the file directly to avoid large memory buffer stalls
            with open(upload_file, "rb") as f:
                r = session.post(
                    endpoint,
                    files={"file": (upload_file.name, f, content_type)},
                    headers={"User-Agent": "ViralClipAI/1.0"},
                    timeout=(180, 600)  # 180s socket connect & write timeout, 600s response read timeout
                )
            if r.status_code == 200:
                break
            elif r.status_code in (502, 503, 504):
                time.sleep(3)
                continue
            else:
                raise RuntimeError(f"Kaggle GPU server error: {r.text}")
        except (requests.exceptions.RequestException, socket.timeout, TimeoutError) as e:
            last_err = e
            logger.warning(f"Kaggle upload attempt {upload_attempts} failed: {e}. Retrying in 3s...")
            time.sleep(3)

    if r is None or r.status_code != 200:
        raise RuntimeError(f"Kaggle connection failed: Please verify your Kaggle notebook is running and tunnel URL is active ({last_err or (r.text if r else 'unknown')})")

    data = r.json()
    job_id = data.get("job_id")
    if not job_id:
        if "segments" in data:
            return _extract_words_from_whisper(data)
        raise RuntimeError(f"Unexpected Kaggle response: {data}")

    if job_id and job_id_callback:
        job_id_callback(job_id)

    poll_url = f"{status_base}/{job_id}"
    start_time = time.time()
    consecutive_errors = 0
    while time.time() - start_time < 900:  # 15 minutes max
        if cancel_check and cancel_check():
            raise RuntimeError("Chunk transcription cancelled by user.")
        time.sleep(3)
        try:
            resp = session.get(poll_url, timeout=15)
            if resp.status_code == 404:
                raise RuntimeError("Kaggle session disconnected or job not found. Please verify your Kaggle notebook is active.")
            if resp.status_code != 200:
                consecutive_errors += 1
                if consecutive_errors >= 8:
                    raise RuntimeError(f"Kaggle server error (HTTP {resp.status_code}). Please check Kaggle GPU server status.")
                continue
            st = resp.json()
            consecutive_errors = 0
            if st.get("status") == "completed":
                result = st.get("result", {})
                return _extract_words_from_whisper(result)
            elif st.get("status") == "error":
                raise RuntimeError(f"Kaggle transcription error: {st.get('error')}")
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as ce:
            consecutive_errors += 1
            if consecutive_errors >= 8:
                raise RuntimeError(f"Kaggle connection lost ({ce}). Please check your Kaggle notebook and tunnel.")
            continue
    raise TimeoutError("Kaggle transcription timed out after 15 minutes. Please check Kaggle GPU server.")


def _extract_words_from_whisper(data: dict) -> List[Dict[str, Any]]:
    words = []
    # If a flat word list is already provided
    if "words" in data and isinstance(data["words"], list) and data["words"]:
        for w in data["words"]:
            word_str = str(w.get("word", "")).strip()
            if word_str:
                words.append({
                    "w": word_str,
                    "s": float(w.get("start", 0.0)),
                    "e": float(w.get("end", 0.0))
                })
        if words:
            return words

    for seg in data.get("segments", []):
        if "words" in seg and seg["words"]:
            for w in seg["words"]:
                word_str = str(w.get("word", "")).strip()
                if word_str:
                    words.append({
                        "w": word_str,
                        "s": float(w.get("start", 0.0)),
                        "e": float(w.get("end", 0.0))
                    })
        else:
            seg_text = seg.get("text", "").strip()
            seg_start = float(seg.get("start", 0.0))
            seg_end = float(seg.get("end", 0.0))
            tokens = seg_text.split()
            if tokens:
                dt = (seg_end - seg_start) / max(1, len(tokens))
                for i, tok in enumerate(tokens):
                    words.append({
                        "w": tok,
                        "s": round(seg_start + i * dt, 3),
                        "e": round(seg_start + (i + 1) * dt, 3)
                    })
    return words


def compute_loudness_per_second(audio: np.ndarray) -> np.ndarray:
    """RMS level in dB for each second of audio."""
    n = len(audio) // SR
    if n == 0:
        return np.zeros(1, dtype=np.float32)
    x = audio[: n * SR].reshape(n, SR).astype(np.float32) / 32768.0
    rms = np.sqrt((x ** 2).mean(axis=1) + 1e-10)
    return (20 * np.log10(rms)).astype(np.float32)


def loud_zscore(db: np.ndarray) -> np.ndarray:
    """Computes z-score of audio decibel levels to identify sudden screaming/laughing/action spikes."""
    if len(db) < 5:
        return np.zeros(len(db), dtype=np.float32)
    return (db - np.median(db)) / (db.std() + 1e-6)


def sentence_ends(words: List[Dict[str, Any]]) -> List[float]:
    """Finds natural sentence finish points based on punctuation (.?!) or speech pauses."""
    punctuated = sum(1 for w in words if str(w.get("w", ""))[-1:] in ".?!\u0964\u061f") >= max(2, len(words) // 80)
    out = []
    for i, w in enumerate(words):
        w_end = float(w.get("e", 0.0))
        gap = (float(words[i + 1]["s"]) - w_end) if i + 1 < len(words) else 9.0
        word_str = str(w.get("w", ""))
        if (punctuated and word_str[-1:] in ".?!\u0964\u061f") or gap >= (1.0 if punctuated else 0.5):
            out.append(w_end)
    return out


def snap_clip_timing(s: float, e: float, words: List[Dict[str, Any]], min_len: float = 15.0, max_len: float = 65.0) -> Tuple[float, float]:
    """Snaps start and end times to natural sentence boundaries so clips never cut off mid-sentence."""
    if not words or e <= s:
        return s, e
    # Snap start to closest word start within 4 seconds
    starts = [float(w["s"]) for w in words if abs(float(w["s"]) - s) <= 4.0]
    if starts:
        s = min(starts, key=lambda x: abs(x - s))
    
    # Snap end to sentence ends within allowed bounds
    stops = [x for x in sentence_ends(words) if s + min_len <= x <= s + max_len]
    if stops:
        after = [x for x in stops if x >= e - 1.0]
        e = after[0] if after and after[0] - e <= 10.0 else min(stops, key=lambda x: abs(x - e))
    else:
        ends = [float(w["e"]) for w in words if s + min_len <= float(w["e"]) <= s + max_len and abs(float(w["e"]) - e) <= 4.0]
        if ends:
            e = min(ends, key=lambda x: abs(x - e))
    e = max(e, s + min_len)
    e = min(e, s + max_len)
    return round(s, 2), round(e, 2)


def sanitize_hook_and_title(raw_hook: str, raw_title: str, game: str = "") -> Tuple[str, str]:
    """Ensures hook is a punchy, engaging 3-6 word curiosity phrase in ALL CAPS and never a single cutoff word."""
    lonely = {
        "HE", "SHE", "IT", "LET", "THE", "THIS", "THAT", "A", "AN", "SO", "AND",
        "LOOK", "WAIT", "BRO", "MAN", "OH", "YEAH", "NO", "WHAT", "WHY", "IS",
        "ARE", "WAS", "WERE", "DO", "DID", "HAS", "HAVE", "HAD", "MY", "ME", "YOU"
    }

    h = str(raw_hook or "").strip().strip('"').strip("'").strip("!").strip("?").strip()
    words = h.split()

    is_bad = False
    if len(words) < 2:
        is_bad = True
    elif len(words) <= 3 and words[0].upper() in lonely and (len(words) < 3 or words[1].upper() in lonely):
        is_bad = True
    elif h.upper() in lonely:
        is_bad = True

    t = str(raw_title or "").strip().strip('"').strip("'")
    t_words = t.split()

    if is_bad:
        if len(t_words) >= 3 and t.upper() not in lonely:
            clean_t = re.sub(r"[^\w\s]", "", t).strip()
            h = " ".join(clean_t.split()[:5]).upper()
        else:
            g = (game or "GAMING").upper()
            fallbacks = [
                f"INSANE {g} MOMENT",
                f"HE ACTUALLY DID THIS",
                f"NO WAY THIS HAPPENED",
                f"HE LOST HIS MIND",
                f"BRO CANNOT BE SERIOUS",
                f"WAIT TILL THE END",
                f"CRAZIEST {g} GLITCH",
                f"POLICE CAUGHT HIM IN 4K"
            ]
            idx = abs(hash(str(raw_hook) + str(raw_title))) % len(fallbacks)
            h = fallbacks[idx]

    final_words = h.split()
    if len(final_words) > 6:
        h = " ".join(final_words[:6])
    if not h.endswith("!") and not h.endswith("?"):
        h += "!"
    h = h.upper()

    if len(t_words) < 2 or t.upper() in lonely:
        t = f"{h.title()} - Epic Moments"

    return h[:45], t[:70]


def make_chunk_prompt(words: List[Dict[str, Any]], title: str, game: str, chunk_label: str, loud_z: Optional[np.ndarray] = None, chunk_offset_sec: float = 0.0, num_clips: int = 5, uploader: str = "") -> str:
    """Builds an elite viral prompt with (LOUD) loudness marks for viral gaming shorts."""
    lines = []
    if words:
        cur_line = []
        line_start = float(words[0]["s"])
        line_loud = False

        for idx, w in enumerate(words):
            cur_line.append(w["w"])
            w_s = float(w["s"])
            w_e = float(w["e"])

            # Detect loudness in audio range of this line
            if loud_z is not None and len(loud_z) > 0:
                rel_s = max(0, int(w_s - chunk_offset_sec))
                rel_e = min(len(loud_z) - 1, int(w_e - chunk_offset_sec) + 1)
                if rel_e >= rel_s:
                    seg = loud_z[rel_s: rel_e + 1]
                    if len(seg) > 0 and float(seg.max()) > 1.5:
                        line_loud = True

            prev_e = float(words[idx - 1]["e"]) if idx > 0 else line_start
            pause = (w_s - prev_e) > 0.7
            punct = str(w["w"])[-1:] in ".?!" and len(cur_line) >= 4
            long_line = (w_s - line_start) > 10.0 or len(cur_line) >= 12

            if pause or punct or long_line:
                m, s = int(line_start // 60), int(line_start % 60)
                loud_tag = "(LOUD) " if line_loud else ""
                lines.append(f"[{m:02d}:{s:02d}] {loud_tag}" + " ".join(cur_line))
                cur_line = []
                line_start = float(words[idx + 1]["s"]) if idx + 1 < len(words) else w_e
                line_loud = False

        if cur_line:
            m, s = int(line_start // 60), int(line_start % 60)
            loud_tag = "(LOUD) " if line_loud else ""
            lines.append(f"[{m:02d}:{s:02d}] {loud_tag}" + " ".join(cur_line))

    transcript_text = "\n".join(lines)

    prompt = f"""You are a master viral clip producer for top gaming creators.
You are analyzing a stream transcript to find high-voltage, explosive viral YouTube Shorts and TikToks.
Lines marked (LOUD) indicate extreme audio spikes: screams, hysterical laughter, rage freakouts, gunfights, or peak hype!

Stream Title: "{title}"
Game: "{game}"
Segment: {chunk_label}

GOAL: Extract the absolute most engaging, high-retention moments from this transcript (5 to 10 clips).

HIGH-RETENTION SELECTION RULES:
1. FOCUS ON HIGH ENERGY & (LOUD) SPIKES: Prioritize screaming, intense laughing, rage, shock, crazy gameplay fails, or funny conversations. Skip quiet, monotonous driving or mundane gameplay.
2. STORY STRUCTURE: Each clip must have a clear 15-55 second arc (Setup -> Escalation -> Loud Climax / Punchline). Never cut off mid-thought or mid-sentence.
3. HOOK REQUIREMENTS (MANDATORY):
   - "hook" is the 3 to 6 word ALL CAPS curiosity text overlay placed on the video.
   - It MUST create irresistible curiosity or describe the insane moment!
   - EXAMPLES OF GREAT HOOKS:
     "HE LOST HIS MIND!"
     "NO WAY HE SURVIVED THIS!"
     "POLICE CAUGHT HIM IN 4K!"
     "HE ACTUALLY DID THIS!"
     "BRO BROKE HIS CONTROLLER!"
     "THE CRAZIEST GTA 6 GLITCH!"
     "HE CANNOT BE SERIOUS!"
   - ABSOLUTELY FORBIDDEN:
     NEVER output a single word like "HE", "SHE", "IT", "LET", "WAIT", "LOOK", "THIS", "BRO", or "OH"!
     Every single hook MUST be a complete, engaging 3 to 6 word phrase in ALL CAPS!
4. HEADLINE / BANNER ("suggested_headline"):
   - High-CTR viral curiosity headline for the on-screen middle badge (under 50 characters, with 1 emoji).
   - CRITICAL RULE: DO NOT put or repeat the creator's/streamer's name in every headline! The audience is already watching the creator on screen.
   - Focus purely on the insane gameplay action, funny fail, dramatic twist, or shocking reveal!
   - EXAMPLES OF GREAT HEADLINES:
     "This Moment Gave Me Chills! 🧟"
     "These Graphics Look Illegal! 😲"
     "Cop Chase Gone Terribly Wrong! 🚔"
     "Wait For His Final Reaction... 😭"
     "He Was Not Ready For This! 💀"
     "Secret Room Finally Discovered! 🔍"
5. HOOK SCORE: 88 to 99 based on virality and energy.

RESPONSE FORMAT (Output ONLY a valid JSON array of objects, with NO conversational text):
```json
[
  {{
    "start_time": "00:04:15",
    "end_time": "00:04:55",
    "hook_score": 96,
    "hook": "HE ACTUALLY DID THIS!",
    "suggested_headline": "Cop Chase Gone Terribly Wrong! 🚔",
    "reason": "Police tank unexpectedly rams into the building causing pure chaos.",
    "hashtags": ["#gta6", "#gaming", "#viral", "#shorts", "#funny"]
  }}
]
```

TRANSCRIPT:
{transcript_text}
"""
    return prompt


def parse_clips_json(raw_text: str) -> List[Dict[str, Any]]:
    """Ultra-resilient JSON clip extractor handling markdown, trailing commas, single quotes, and direct regex fallback."""
    cleaned = raw_text.strip()
    
    # 1. Remove markdown fences if wrapped
    cleaned = re.sub(r"^```(?:json)?", "", cleaned, flags=re.IGNORECASE).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()
    
    # 2. Extract outermost [ ... ] or { ... }
    start_arr = cleaned.find("[")
    end_arr = cleaned.rfind("]")
    if start_arr != -1 and end_arr != -1 and end_arr > start_arr:
        cleaned = cleaned[start_arr: end_arr + 1].strip()

    # 3. Clean trailing commas & smart quotes
    cleaned_fixed = re.sub(r",\s*([\]}])", r"\1", cleaned)

    data = None
    try:
        data = json.loads(cleaned_fixed)
    except Exception:
        try:
            cleaned_fixed2 = cleaned_fixed.replace("“", '"').replace("”", '"').replace("'", '"')
            data = json.loads(cleaned_fixed2)
        except Exception:
            pass

    # 4. If data is a dict (e.g. {"clips": [...]}), extract inner list
    if isinstance(data, dict):
        for k in ("clips", "moments", "shorts", "items", "data", "results"):
            if k in data and isinstance(data[k], list):
                data = data[k]
                break

    # 5. If JSON parsing failed, use regex fallback to extract each object
    if not isinstance(data, list):
        data = []
        obj_matches = re.finditer(r"\{[^{}]*\}", raw_text)
        for m in obj_matches:
            block = m.group(0)
            s_match = re.search(r'["\']?(?:start_time|start)["\']?\s*:\s*["\']?([^"\',}\s]+)', block, re.IGNORECASE)
            e_match = re.search(r'["\']?(?:end_time|end)["\']?\s*:\s*["\']?([^"\',}\s]+)', block, re.IGNORECASE)
            h_match = re.search(r'["\']?(?:hook|headline)["\']?\s*:\s*["\']([^"\']+)["\']', block, re.IGNORECASE)
            t_match = re.search(r'["\']?(?:suggested_headline|title)["\']?\s*:\s*["\']([^"\']+)["\']', block, re.IGNORECASE)
            sc_match = re.search(r'["\']?(?:hook_score|score)["\']?\s*:\s*([0-9]+)', block, re.IGNORECASE)

            if s_match and e_match:
                data.append({
                    "start_time": s_match.group(1),
                    "end_time": e_match.group(1),
                    "hook": h_match.group(1) if h_match else "INSANE GAMING MOMENT!",
                    "suggested_headline": t_match.group(1) if t_match else (h_match.group(1) if h_match else "GTA 6 Short"),
                    "hook_score": int(sc_match.group(1)) if sc_match else 95
                })

    def parse_time(val) -> float:
        if isinstance(val, (int, float)):
            return float(val)
        val = str(val).strip().strip('"').strip("'")
        parts = val.split(":")
        if len(parts) == 3:
            return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
        elif len(parts) == 2:
            return float(parts[0]) * 60 + float(parts[1])
        try:
            return float(val)
        except Exception:
            return 0.0

    parsed = []
    for item in data:
        start = parse_time(item.get("start_time") or item.get("start", 0))
        end = parse_time(item.get("end_time") or item.get("end", 0))
        if end <= start:
            continue
        raw_h = item.get("hook") or item.get("headline") or "INSANE MOMENT!"
        raw_t = item.get("suggested_headline") or item.get("title") or raw_h
        hook, title = sanitize_hook_and_title(raw_h, raw_t)
        score = int(item.get("hook_score") or item.get("score") or 95)
        parsed.append({
            "start": round(start, 2),
            "end": round(end, 2),
            "hook": hook,
            "title": title,
            "score": score,
            "description": item.get("description", ""),
            "hashtags": item.get("hashtags", [])
        })
    return parsed


class LiveSniperSession:
    def __init__(self, url: str, style: str = "bounce", layout: str = "gameplay", enable_facecam: bool = True):
        self.id = str(uuid.uuid4())[:8]
        self.url = url
        self.style = style
        self.layout = layout
        self.enable_facecam = enable_facecam
        self.title = "Live Stream"
        self.uploader = ""
        self.game = ""

        self.buf_dir = config.BUFFER_DIR / self.id
        self.buf_dir.mkdir(parents=True, exist_ok=True)
        self.clips_dir = config.CLIPS_DIR
        self.clips_dir.mkdir(parents=True, exist_ok=True)

        self.lock = threading.RLock()
        self.stop_flag = threading.Event()
        self.ended = False
        self.status = "starting"
        self.error: Optional[str] = None
        self.proc: Optional[subprocess.Popen] = None

        self.samples = 0
        self.db: List[float] = []
        self.chat_velocity = 0
        self.chat_counter = collections.Counter()

        self.segments: List[tuple] = []
        self.seg_clock = 0.0
        self.csv_seen: Dict[int, int] = {}
        self.part = 0

        self.words: List[Dict[str, Any]] = []
        self.pending_pcm = bytearray()

        self.facecam_box = None
        self.facecam_checked = False
        self.clips: List[Dict[str, Any]] = []
        self.n_clip = 0
        self.started_at = time.time()

    def start(self):
        threading.Thread(target=self._ingest_thread, daemon=True, name="live_ingest").start()
        threading.Thread(target=self._stats_thread, daemon=True, name="live_stats").start()
        m = re.match(r"^https?://(?:www\.)?twitch\.tv/([A-Za-z0-9_]+)", self.url)
        if m:
            threading.Thread(target=self._twitch_chat_thread, args=(m.group(1).lower(),), daemon=True).start()

    def stop(self):
        self.stop_flag.set()
        self.ended = True
        self.status = "stopped"
        if self.proc and self.proc.poll() is None:
            try:
                self.proc.terminate()
            except Exception:
                pass

    def _ingest_thread(self):
        try:
            info = media.resolve_stream(self.url)
            self.title = info["title"]
            self.uploader = info["uploader"]
            self.game = games.detect(None, self.title, self.uploader)[0] or "Gaming"
            self.status = "recording"

            p = f"p{self.part + 1:02d}"
            cmd = [
                "ffmpeg", "-v", "error", "-reconnect", "1", "-reconnect_streamed", "1", "-reconnect_delay_max", "10"
            ]
            for u in info["urls"]:
                cmd += ["-i", u]
            a_in = "1:a:0" if len(info["urls"]) > 1 else "0:a:0"
            cmd += [
                "-map", "0:v:0", "-map", a_in, "-c", "copy", "-f", "segment", "-segment_time", str(SEG_SEC),
                "-reset_timestamps", "1", "-segment_format", "mpegts", "-segment_list", f"{p}.csv",
                "-segment_list_type", "csv", f"{p}_%05d.ts",
                "-map", a_in, "-vn", "-ac", "1", "-ar", str(SR), "-f", "s16le", "pipe:1"
            ]

            with open(self.buf_dir / "ffmpeg.log", "ab") as errlog:
                self.proc = subprocess.Popen(
                    cmd, cwd=self.buf_dir, stdout=subprocess.PIPE, stderr=errlog, creationflags=media.NO_WINDOW
                )
                while not self.stop_flag.is_set():
                    data = self.proc.stdout.read(SR * 2)
                    if not data:
                        break
                    data = data[: len(data) // 2 * 2]
                    x = np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32768.0
                    level = float(20 * np.log10(np.sqrt((x ** 2).mean() + 1e-10))) if len(x) else -100.0
                    with self.lock:
                        self.pending_pcm += data
                        self.samples += len(data) // 2
                        self.db.append(round(level, 1))
                        if len(self.db) > 120:
                            self.db.pop(0)
                self.proc.wait()
        except Exception as e:
            self.error = str(e)
            self.status = "error"
        finally:
            self.ended = True
            if self.status != "error":
                self.status = "done"

    def _stats_thread(self):
        while not self.stop_flag.is_set() and not self.ended:
            self._scan_segments()
            time.sleep(2)

    def _scan_segments(self):
        with self.lock:
            for i in range(1, 20):
                f = self.buf_dir / f"p{i:02d}.csv"
                if not f.exists():
                    continue
                rows = [r.split(",") for r in f.read_text(encoding="utf-8", errors="ignore").splitlines() if r.count(",") >= 2]
                for name, a, b in (r[:3] for r in rows[self.csv_seen.get(i, 0):]):
                    try:
                        dur = max(0.0, float(b) - float(a))
                    except ValueError:
                        continue
                    self.segments.append((self.buf_dir / name, self.seg_clock, self.seg_clock + dur))
                    self.seg_clock += dur
                self.csv_seen[i] = len(rows)

    def _twitch_chat_thread(self, channel: str):
        while not self.stop_flag.is_set() and not self.ended:
            try:
                s = socket.create_connection(("irc.chat.twitch.tv", 6667), timeout=10)
                s.sendall(f"NICK justinfan{int(time.time()) % 100000}\r\nJOIN #{channel}\r\n".encode("utf-8"))
                buf = ""
                while not self.stop_flag.is_set():
                    raw = s.recv(4096)
                    if not raw:
                        break
                    buf += raw.decode("utf-8", errors="ignore")
                    lines = buf.split("\r\n")
                    buf = lines.pop()
                    sec = int(time.time())
                    for line in lines:
                        if line.startswith("PING"):
                            s.sendall(b"PONG :tmi.twitch.tv\r\n")
                        elif "PRIVMSG" in line:
                            with self.lock:
                                self.chat_counter[sec] += 1
                                self.chat_velocity = sum(self.chat_counter[t] for t in range(sec - 5, sec + 1)) // 5
            except Exception:
                time.sleep(5)

    def clip_last(self, seconds: int = 45) -> Dict[str, Any]:
        cur_time = self.samples / SR
        if cur_time < 5:
            raise ValueError("Buffer just started. Wait a few seconds to snipe.")

        start_t = max(0.0, cur_time - seconds)
        end_t = cur_time

        clip_id = f"sniper_{int(time.time())}_{self.n_clip + 1}"
        self.n_clip += 1

        clip_info = {
            "id": clip_id,
            "title": f"{self.game} - Viral Moment",
            "hook": f"INSANE {self.game.upper()} MOMENT!",
            "start": start_t,
            "end": end_t,
            "status": "rendering",
            "game": self.game,
            "style": self.style,
            "layout": self.layout
        }

        threading.Thread(target=self._render_snipe_clip, args=(clip_info, start_t, end_t), daemon=True).start()
        return clip_info

    def _render_snipe_clip(self, clip_info: Dict[str, Any], start_t: float, end_t: float):
        try:
            self._scan_segments()
            with self.lock:
                segs = [s for s in self.segments if s[2] > start_t - PAD and s[1] < end_t + PAD and s[0].exists()]

            if not segs:
                clip_info.update(status="error", error="Target buffer segments not yet written.")
                return

            lst = self.buf_dir / f"{clip_info['id']}.txt"
            lst.write_text("".join(f"file '{s[0].as_posix()}'\n" for s in segs), encoding="utf-8")
            concat_src = self.buf_dir / f"{clip_info['id']}.src.ts"

            media.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(concat_src)])
            lst.unlink(missing_ok=True)

            meta = media.probe(concat_src)
            src_w, src_h = meta["width"], meta["height"]

            wav_path = self.buf_dir / f"{clip_info['id']}.wav"
            media.extract_audio(concat_src, wav_path)
            audio_data = media.load_audio(wav_path)
            words = transcribe.transcribe(audio_data)
            wav_path.unlink(missing_ok=True)

            face_box = None
            if self.enable_facecam and self.layout == "gameplay":
                if not self.facecam_checked:
                    face_box = facecam.detect(concat_src)
                    if face_box and face_box.get("conf") == "high":
                        self.facecam_box = [face_box["x"], face_box["y"], face_box["w"], face_box["h"]]
                    self.facecam_checked = True
                face_box = self.facecam_box

            transcript_text = " ".join(w["w"] for w in words)
            hook_text = f"WAIT FOR THIS {self.game.upper()} MOMENT!"
            if transcript_text:
                try:
                    summary = brain.clip_hook(words, self.game)
                    if summary:
                        hook_text = summary
                except Exception:
                    pass

            clip_info["hook"] = hook_text
            clip_info["facecam"] = face_box

            clip_meta = {
                "start": 0.0,
                "end": end_t - start_t,
                "hook": hook_text,
                "style": self.style,
                "layout": self.layout,
                "facecam": face_box,
                "captions": True,
                "highlight_words": [w["w"] for w in words if len(w["w"]) > 4]
            }

            render_res = render.render_clip(
                concat_src, self.clips_dir, clip_info["id"], clip_meta, words, src_w, src_h
            )
            concat_src.unlink(missing_ok=True)

            clip_info.update(
                status="done",
                video_url=f"/sniper/clips/{render_res['file']}",
                cover_url=f"/sniper/clips/{render_res['cover']}",
                duration=round(end_t - start_t, 1),
                score=95
            )
            save_clip_to_registry(clip_info)
        except Exception as e:
            clip_info.update(status="error", error=str(e))


VOD_SESSIONS_FILE = config.STORAGE_DIR / "vod_sessions.json"


def list_saved_vod_sessions() -> List[Dict[str, Any]]:
    """Returns list of all saved VOD scanner sessions sorted by most recent."""
    if not VOD_SESSIONS_FILE.exists():
        return []
    try:
        data = json.loads(VOD_SESSIONS_FILE.read_text(encoding="utf-8"))
        if isinstance(data, list):
            return sorted(data, key=lambda s: s.get("created_at", 0), reverse=True)
        return []
    except Exception:
        return []


def save_vod_session_to_disk(sess: "VODSniperSession"):
    """Persists VODSniperSession metadata to disk so user can resume anytime without re-downloading."""
    try:
        sessions = list_saved_vod_sessions()
        sess_dict = sess.to_dict()
        updated = False
        for idx, s in enumerate(sessions):
            if s.get("id") == sess.id or (s.get("url") == sess.url and s.get("title") == sess.title):
                sessions[idx] = sess_dict
                updated = True
                break
        if not updated:
            sessions.insert(0, sess_dict)
        VOD_SESSIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
        VOD_SESSIONS_FILE.write_text(json.dumps(sessions, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"[WARN] Failed to save VOD session: {e}")


def restore_vod_session_from_disk(session_id: str) -> Optional["VODSniperSession"]:
    """Restores a saved VODSniperSession, linking cached audio and transcripts for 0s instant load."""
    global VOD_SESSION
    sessions = list_saved_vod_sessions()
    target = next((s for s in sessions if s.get("id") == session_id), None)
    if not target:
        return None

    sess = VODSniperSession(
        url=target["url"],
        style=target.get("style", "bounce"),
        layout=target.get("layout", "splitscreen"),
        enable_facecam=target.get("enable_facecam", False),
        chunk_minutes=target.get("chunk_minutes", 30),
        facecam_box=target.get("facecam_box"),
        gameplay_box=target.get("gameplay_box"),
        hook_y=target.get("hook_y"),
        cap_y=target.get("cap_y"),
        split_pct=target.get("split_pct", 35)
    )
    sess.reframe_locked = target.get("reframe_locked", bool(target.get("facecam_box")))
    sess.id = target["id"]
    sess.title = target.get("title", "")
    sess.uploader = target.get("uploader", "")
    sess.duration = float(target.get("duration", 0.0))
    sess.game = target.get("game", "Gaming")
    sess.chunks = target.get("chunks", [])
    for idx, c in enumerate(sess.chunks):
        if not c.get("chunk_id"):
            c["chunk_id"] = f"{sess.id}_c{idx + 1}"
        if "clips" not in c:
            c["clips"] = []
    sess.active_chunk_idx = target.get("active_chunk_idx", 0)
    sess.kaggle_url = target.get("kaggle_url")
    sess.created_at = target.get("created_at", time.time())
    sess.work_dir = config.BUFFER_DIR / f"vod_{sess.id}"
    sess.status = "ready"
    sess.stage = f"Session restored: {sess.title} ({len(sess.chunks)} chunks ready)"

    # Relink master audio if present
    cached_audio = target.get("master_audio_path")
    if cached_audio and Path(cached_audio).exists():
        sess.master_audio_path = Path(cached_audio)
    else:
        for p in sess.work_dir.glob("master_audio.*"):
            if p.suffix not in (".part", ".ytdl") and p.stat().st_size > 1000000:
                sess.master_audio_path = p
                break

    VOD_SESSION = sess
    return sess


def delete_saved_vod_session(session_id: str):
    """Deletes a saved VOD session from history."""
    sessions = list_saved_vod_sessions()
    sessions = [s for s in sessions if s.get("id") != session_id]
    VOD_SESSIONS_FILE.write_text(json.dumps(sessions, indent=2), encoding="utf-8")


class VODSniperSession:
    """Manages full broadcast/VOD scanning with 30-min chunk separation, dual transcriber, and prompt/auto modes."""
    def __init__(self, url: str, style: str = "bounce", layout: str = "splitscreen", enable_facecam: bool = False, chunk_minutes: int = 30, facecam_box: list = None, gameplay_box: list = None, hook_y: float = None, cap_y: float = None, split_pct: int = 35):
        self.id = str(uuid.uuid4())[:8]
        self.url = url
        self.style = style
        self.layout = layout or "splitscreen"
        self.enable_facecam = enable_facecam
        self.chunk_minutes = chunk_minutes or 30
        self.facecam_box = facecam_box or [1280, 0, 640, 480]
        self.gameplay_box = gameplay_box or [0, 0, 1920, 1080]
        self.hook_y = hook_y if hook_y is not None else 672  # 35% of 1920
        self.cap_y = cap_y if cap_y is not None else 1728   # 90% of 1920
        self.split_pct = split_pct if split_pct is not None else 35
        self.reframe_locked = bool(facecam_box)
        self.created_at = time.time()

        self.title = ""
        self.uploader = ""
        self.duration = 0.0
        self.game = ""

        self.status = "idle"
        self.stage = ""
        self.progress = 0
        self.error: Optional[str] = None
        self.stop_flag = threading.Event()

        self.work_dir = config.BUFFER_DIR / f"vod_{self.id}"
        self.work_dir.mkdir(parents=True, exist_ok=True)
        self.clips_dir = config.CLIPS_DIR

        self.master_audio_path: Optional[Path] = None
        self.kaggle_url: Optional[str] = None
        self.chunks: List[Dict[str, Any]] = []
        self.active_chunk_idx: Optional[int] = 0
        self.merged_transcript: Dict[str, Any] = {}
        self.clips: List[Dict[str, Any]] = []
        self.chunk_queue: List[Dict[str, Any]] = []
        self._queue_worker_running: bool = False
        self._queue_lock = threading.Lock()

    def to_dict(self) -> Dict[str, Any]:
        """Serializes session state for storage history persistence."""
        return {
            "id": self.id,
            "url": self.url,
            "title": self.title,
            "uploader": self.uploader,
            "duration": self.duration,
            "game": self.game,
            "style": self.style,
            "layout": self.layout,
            "enable_facecam": self.enable_facecam,
            "chunk_minutes": self.chunk_minutes,
            "facecam_box": getattr(self, "facecam_box", [1280, 0, 640, 480]),
            "gameplay_box": getattr(self, "gameplay_box", [0, 0, 1920, 1080]),
            "hook_y": getattr(self, "hook_y", 672),
            "cap_y": getattr(self, "cap_y", 1728),
            "split_pct": getattr(self, "split_pct", 35),
            "reframe_locked": getattr(self, "reframe_locked", False),
            "status": self.status,
            "stage": self.stage,
            "kaggle_url": getattr(self, "kaggle_url", None),
            "chunk_queue": [q["chunk_idx"] for q in getattr(self, "chunk_queue", [])],
            "chunks": self.chunks,
            "active_chunk_idx": self.active_chunk_idx,
            "master_audio_path": str(self.master_audio_path) if self.master_audio_path else "",
            "created_at": getattr(self, "created_at", time.time())
        }

    def init_stream(self):
        """Inspects stream URL and calculates chunk intervals."""
        self.status = "inspecting"
        self.stage = "Analyzing broadcast info and duration..."
        info = media.resolve_stream(self.url)
        self.title = info["title"]
        self.uploader = info["uploader"]
        self.duration = float(info.get("duration") or 0.0)
        self.game = games.detect(None, self.title, self.uploader)[0] or "Gaming"

        step = self.chunk_minutes * 60
        total_time = max(step, self.duration)
        self.chunks = []

        n_chunks = max(1, int(np.ceil(total_time / step)))
        for i in range(n_chunks):
            c_start = i * step
            c_end = min(total_time, (i + 1) * step)

            m_s1, s_s1 = divmod(int(c_start), 60)
            h_s1, m_s1 = divmod(m_s1, 60)
            m_s2, s_s2 = divmod(int(c_end), 60)
            h_s2, m_s2 = divmod(m_s2, 60)

            lbl1 = f"{h_s1:02d}:{m_s1:02d}:{s_s1:02d}" if h_s1 > 0 else f"{m_s1:02d}:{s_s1:02d}"
            lbl2 = f"{h_s2:02d}:{m_s2:02d}:{s_s2:02d}" if h_s2 > 0 else f"{m_s2:02d}:{s_s2:02d}"

            chunk_id = f"{self.id}_c{i+1}"
            self.chunks.append({
                "chunk_id": chunk_id,
                "index": i,
                "label": f"Chunk {i+1} ({lbl1} - {lbl2})",
                "start": c_start,
                "end": c_end,
                "duration_min": round((c_end - c_start) / 60, 1),
                "status": "idle",
                "queue_position": None,
                "words": [],
                "prompt": "",
                "clips_count": 0,
                "clips": [],
                "kaggle_job_id": None
            })
        self.status = "ready"
        self.stage = f"Stream ready: {n_chunks} chunks ({self.chunk_minutes}m each)."
        save_vod_session_to_disk(self)

    def ensure_master_audio(self):
        """Downloads full audio stream once so any 30-min slice extracts in 5 seconds."""
        if self.master_audio_path and self.master_audio_path.exists():
            return self.master_audio_path

        # Check existing cached audio
        for p in self.work_dir.glob("master_audio.*"):
            if p.suffix not in (".part", ".ytdl") and p.stat().st_size > 1000000:
                self.master_audio_path = p
                return p

        def _prog(pct, msg):
            self.progress = int(10 + (pct * 0.35))  # 10% to 45%
            self.stage = msg

        self.stage = "Connecting to stream audio..."
        self.progress = 10
        p = media.download_audio_fast(self.url, self.work_dir / "master_audio", progress_cb=_prog)
        self.master_audio_path = p
        return p

    def enqueue_chunk(self, chunk_idx: int, transcriber: str = "parakeet", kaggle_url: Optional[str] = None, ai_mode: str = "auto") -> Dict[str, Any]:
        """Schedules chunk for sequential execution or runs immediately if no chunk is active."""
        if chunk_idx < 0 or chunk_idx >= len(self.chunks):
            raise ValueError("Invalid chunk index")

        chunk = self.chunks[chunk_idx]
        if not chunk.get("chunk_id"):
            chunk["chunk_id"] = f"{self.id}_c{chunk_idx + 1}"

        if not hasattr(self, "_queue_lock"):
            self._queue_lock = threading.Lock()
        if not hasattr(self, "chunk_queue"):
            self.chunk_queue = []

        with self._queue_lock:
            # If already running
            if getattr(self, "_queue_worker_running", False) and self.active_chunk_idx == chunk_idx and chunk.get("status") == "processing":
                return {"status": "processing", "chunk_idx": chunk_idx}

            # If already in queue
            for q_idx, q in enumerate(self.chunk_queue):
                if q["chunk_idx"] == chunk_idx:
                    return {"status": "queued", "chunk_idx": chunk_idx, "position": q_idx + 1}

            # If busy processing another chunk, enqueue this one sequentially!
            if getattr(self, "_queue_worker_running", False) and self.active_chunk_idx is not None and self.active_chunk_idx != chunk_idx:
                pos = len(self.chunk_queue) + 1
                chunk["status"] = "queued"
                chunk["queue_position"] = pos
                chunk.pop("error", None)
                item = {
                    "chunk_idx": chunk_idx,
                    "transcriber": transcriber,
                    "kaggle_url": kaggle_url,
                    "ai_mode": ai_mode,
                    "position": pos
                }
                self.chunk_queue.append(item)
                save_vod_session_to_disk(self)
                return {"status": "queued", "chunk_idx": chunk_idx, "position": pos}

            # Otherwise start processing immediately
            chunk["status"] = "processing"
            chunk.pop("queue_position", None)
            chunk.pop("error", None)
            self.error = None
            self._queue_worker_running = True
            save_vod_session_to_disk(self)

        def _worker_thread():
            curr_idx = chunk_idx
            curr_transcriber = transcriber
            curr_kaggle_url = kaggle_url
            curr_ai_mode = ai_mode

            while curr_idx is not None:
                try:
                    self.process_chunk(curr_idx, curr_transcriber, curr_kaggle_url, curr_ai_mode)
                except Exception as e:
                    logger.error(f"Error in queue worker processing chunk {curr_idx + 1}: {e}")

                # Check for next queued chunk
                with self._queue_lock:
                    if self.chunk_queue:
                        next_item = self.chunk_queue.pop(0)
                        curr_idx = next_item["chunk_idx"]
                        curr_transcriber = next_item["transcriber"]
                        curr_kaggle_url = next_item["kaggle_url"]
                        curr_ai_mode = next_item["ai_mode"]
                        # Update remaining positions
                        for i, q in enumerate(self.chunk_queue):
                            q["position"] = i + 1
                            if 0 <= q["chunk_idx"] < len(self.chunks):
                                self.chunks[q["chunk_idx"]]["queue_position"] = i + 1
                        save_vod_session_to_disk(self)
                    else:
                        curr_idx = None
                        self._queue_worker_running = False
                        self.active_chunk_idx = None
                        self.status = "idle"
                        save_vod_session_to_disk(self)

        threading.Thread(target=_worker_thread, daemon=True).start()
        return {"status": "processing", "chunk_idx": chunk_idx}

    def cancel_chunk(self, chunk_idx: int):
        """Cancels chunk processing or removes it from queue, resetting its status."""
        if not hasattr(self, "_queue_lock"):
            self._queue_lock = threading.Lock()
        if not hasattr(self, "chunk_queue"):
            self.chunk_queue = []

        with self._queue_lock:
            # If in queue, remove it
            self.chunk_queue = [q for q in self.chunk_queue if q["chunk_idx"] != chunk_idx]
            for i, q in enumerate(self.chunk_queue):
                q["position"] = i + 1
                if 0 <= q["chunk_idx"] < len(self.chunks):
                    self.chunks[q["chunk_idx"]]["queue_position"] = i + 1

        self._cancelled_chunks = getattr(self, "_cancelled_chunks", set())
        self._cancelled_chunks.add(chunk_idx)
        if 0 <= chunk_idx < len(self.chunks):
            has_words = bool(self.chunks[chunk_idx].get("words"))
            self.chunks[chunk_idx]["status"] = "ready_prompt" if has_words else "ready"
            self.chunks[chunk_idx].pop("queue_position", None)
            if not has_words:
                self.chunks[chunk_idx]["words"] = []
                self.chunks[chunk_idx]["prompt"] = None
            self.chunks[chunk_idx]["error"] = None
            self.chunks[chunk_idx]["clips_count"] = 0

        if self.active_chunk_idx == chunk_idx:
            self.status = "idle"
            self.stage = f"Chunk {chunk_idx + 1} cancelled."

        save_vod_session_to_disk(self)

    def process_chunk(self, chunk_idx: int, transcriber: str = "parakeet", kaggle_url: Optional[str] = None, ai_mode: str = "auto"):
        """Transcribes a single 30m chunk and automatically analyzes and renders viral clips if AI keys exist."""
        if chunk_idx < 0 or chunk_idx >= len(self.chunks):
            raise ValueError("Invalid chunk index")

        self._cancelled_chunks = getattr(self, "_cancelled_chunks", set())
        if chunk_idx in self._cancelled_chunks:
            self._cancelled_chunks.remove(chunk_idx)

        chunk = self.chunks[chunk_idx]
        self.active_chunk_idx = chunk_idx
        chunk["status"] = "processing"
        self.status = "processing"

        def _is_cancelled() -> bool:
            return chunk_idx in getattr(self, "_cancelled_chunks", set())

        def _handle_cancel():
            chunk["status"] = "ready"
            chunk["words"] = []
            chunk["prompt"] = None
            chunk["error"] = None
            chunk["clips_count"] = 0
            self.error = None
            self.status = "idle"
            self.stage = f"Chunk {chunk_idx + 1} cancelled."
            save_vod_session_to_disk(self)

        try:
            if _is_cancelled():
                _handle_cancel()
                return

            c_start, c_end = chunk["start"], chunk["end"]
            chunk_wav = self.work_dir / f"chunk_{chunk_idx}.wav"

            # Check if words already transcribed to avoid redundant audio extraction
            if not chunk.get("words"):
                if self.master_audio_path and self.master_audio_path.exists():
                    self.stage = f"Extracting {chunk['label']} audio slice..."
                    self.progress = 30
                    media.run([
                        "ffmpeg", "-y", "-v", "error", "-ss", f"{c_start:.2f}", "-t", f"{c_end - c_start:.2f}",
                        "-i", str(self.master_audio_path), "-vn", "-ac", "1", "-ar", "16000", str(chunk_wav)
                    ])
                else:
                    self.stage = f"⚡ Fast range download: {chunk['label']} (~10s)..."
                    self.progress = 20
                    def _prog(pct, msg):
                        if _is_cancelled():
                            raise RuntimeError("Chunk cancelled by user.")
                        self.progress = int(10 + (pct * 0.25))
                        self.stage = msg
                    slice_raw = media.download_audio_section(self.url, self.work_dir, f"raw_audio_{chunk_idx}", c_start, c_end, progress_cb=_prog)

                    if _is_cancelled():
                        slice_raw.unlink(missing_ok=True)
                        _handle_cancel()
                        return

                    self.stage = f"Converting {chunk['label']} to speech audio..."
                    self.progress = 38
                    media.run([
                        "ffmpeg", "-y", "-v", "error", "-i", str(slice_raw),
                        "-vn", "-ac", "1", "-ar", "16000", str(chunk_wav)
                    ])
                    slice_raw.unlink(missing_ok=True)

                if _is_cancelled():
                    _handle_cancel()
                    return

                # Compute loudness profile for this chunk (audio decibel RMS + z-score analysis)
                audio_data = media.load_audio(chunk_wav)
                chunk_db = compute_loudness_per_second(audio_data)
                chunk_loud = loud_zscore(chunk_db)

                if _is_cancelled():
                    _handle_cancel()
                    return

                # Transcribe
                if transcriber == "kaggle" and kaggle_url and kaggle_url.strip():
                    self.stage = f"⚡ AI Speech Engine: Transcribing {chunk['label']} on Remote Kaggle GPU (Whisper Large-V3)..."
                    self.progress = 50
                    self.kaggle_url = kaggle_url.strip()

                    def _save_job_id(jid: str):
                        chunk["kaggle_job_id"] = jid
                        save_vod_session_to_disk(self)

                    raw_words = transcribe_remote_kaggle(
                        chunk_wav, kaggle_url.strip(),
                        cancel_check=_is_cancelled,
                        job_id_callback=_save_job_id,
                        known_job_id=chunk.get("kaggle_job_id")
                    )
                else:
                    self.stage = f"⚡ AI Speech Engine: Transcribing {chunk['label']} with NeMo Neural Model..."
                    self.progress = 50
                    raw_words = transcribe.transcribe(audio_data)

                if _is_cancelled():
                    _handle_cancel()
                    return

                # Rebase timestamps to global stream timeline
                global_words = []
                for w in raw_words:
                    global_words.append({
                        "w": w["w"],
                        "s": round(c_start + w["s"], 2),
                        "e": round(c_start + w["e"], 2)
                    })

                chunk["words"] = global_words
                prompt_str = make_chunk_prompt(
                    global_words, self.title, self.game, chunk["label"],
                    loud_z=chunk_loud, chunk_offset_sec=c_start, uploader=self.uploader
                )
                chunk["prompt"] = prompt_str
            else:
                global_words = chunk["words"]
                prompt_str = chunk.get("prompt") or make_chunk_prompt(
                    global_words, self.title, self.game, chunk["label"], uploader=self.uploader
                )

            if _is_cancelled():
                _handle_cancel()
                return

            # Determine whether to auto-run AI brain
            keys = config.get_api_keys()
            has_ai_key = any(bool(keys.get(k) and keys[k].strip()) for k in ("groq", "gemini", "openai", "openrouter"))
            is_manual = (
                ai_mode is False
                or str(ai_mode).lower() in ("false", "manual", "manual_only", "prompt", "manual_prompt")
            )
            should_auto = (not is_manual) and has_ai_key

            if should_auto:
                chunk["completed_mode"] = "ai"
                self.stage = f"⚡ AI Brain discovering viral moments for {chunk['label']}..."
                self.progress = 75
                raw_json = brain.generate_chunk_clips_json(prompt_str)
                if _is_cancelled():
                    _handle_cancel()
                    return
                if raw_json:
                    picked = parse_clips_json(raw_json)
                    if _is_cancelled():
                        _handle_cancel()
                        return
                    if picked:
                        self.stage = f"⚡ AI discovered {len(picked)} viral clips! Slicing & rendering shorts..."
                        self._render_clips_for_chunk(chunk_idx, picked)
                        chunk["status"] = "done"
                    else:
                        chunk["status"] = "ready_prompt"
                        self.stage = f"AI returned non-standard format. Ready for manual prompt."
                else:
                    chunk["status"] = "ready_prompt"
                    self.stage = f"AI auto-analysis skipped (no key). Ready for manual prompt."
            else:
                chunk["completed_mode"] = "manual"
                chunk["status"] = "ready_prompt"
                self.stage = f"{chunk['label']} transcribed! Click 'Copy AI Prompt' or 'Paste JSON'."

            if _is_cancelled():
                _handle_cancel()
                return

            self.progress = 100
            self.status = "idle"
            save_vod_session_to_disk(self)
        except Exception as e:
            if _is_cancelled() or chunk_idx in getattr(self, "_cancelled_chunks", set()):
                _handle_cancel()
                return
            chunk["status"] = "error"
            chunk["error"] = str(e)
            self.error = str(e)
            self.status = "error"
            self.stage = f"Error: {e}"
            save_vod_session_to_disk(self)

    def submit_json_for_chunk(self, chunk_idx: int, json_str: str, style: str = None, layout: str = None):
        """Parses user pasted JSON from ChatGPT and renders all clips with dynamic hook, title, score."""
        if style:
            self.style = style
        if layout:
            self.layout = layout
        if chunk_idx < 0 or chunk_idx >= len(self.chunks):
            raise ValueError("Invalid chunk index")

        chunk = self.chunks[chunk_idx]
        clips_data = parse_clips_json(json_str)
        if not clips_data:
            raise ValueError("No valid clips found in pasted JSON.")

        chunk["completed_mode"] = "manual"
        chunk["status"] = "processing"
        self.status = "processing"
        self.active_chunk_idx = chunk_idx
        save_vod_session_to_disk(self)
        try:
            self._render_clips_for_chunk(chunk_idx, clips_data)
        except Exception as e:
            logger.error(f"Error executing pasted JSON for chunk {chunk_idx + 1}: {e}")
            chunk["status"] = "error"
            chunk["error"] = str(e)
            self.status = "error"
            self.error = str(e)
            save_vod_session_to_disk(self)

    def _render_clips_for_chunk(self, chunk_idx: int, clips_list: List[Dict[str, Any]]):
        chunk = self.chunks[chunk_idx]
        chunk["status"] = "processing"
        self.status = "processing"
        self.active_chunk_idx = chunk_idx
        chunk_id = chunk.get("chunk_id", f"{self.id}_c{chunk_idx+1}")
        runs_count = chunk.get("runs_count", 0) + 1
        chunk["runs_count"] = runs_count
        batch_id = f"{chunk_id}_b{runs_count}"
        clip_prefix = f"{chunk_id}_r{runs_count}" if runs_count > 1 else chunk_id
        save_vod_session_to_disk(self)

        total = len(clips_list)
        face_box = None
        rendered_count = 0

        for idx, c in enumerate(clips_list):
            if self.stop_flag.is_set() or chunk_idx in getattr(self, "_cancelled_chunks", set()):
                break

            self.stage = f"Rendering Short {idx+1}/{total}: {c.get('suggested_headline') or c.get('hook', 'Clip')}..."
            self.progress = int(80 + (idx / total) * 19)

            clip_stem = f"vod_{clip_prefix}_{idx+1}"
            raw_s = max(0.0, float(c["start"]))
            raw_e = float(c["end"])

            try:
                # Sentence snapping: ensure clip starts on setup and ends cleanly on sentence end
                start_t, end_t = snap_clip_timing(raw_s, raw_e, chunk.get("words", []))

                # Download exact video stretch in crisp 720p HLS quality (ultra-fast download + 2x faster decode)
                piece = media.download_section(
                    self.url, self.work_dir / "clips", f"{clip_stem}_raw", start_t, end_t + 4, height=720, exact=False
                )
                meta = media.probe(piece)
                src_w, src_h = meta["width"], meta["height"]

                if self.enable_facecam and self.layout == "gameplay" and not face_box:
                    fb = facecam.detect(piece)
                    if fb and fb.get("conf") == "high":
                        face_box = [fb["x"], fb["y"], fb["w"], fb["h"]]

                # Words inside clip duration - DEEP COPY to prevent corrupting master chunk["words"]
                c_words = [
                    {
                        "w": str(w["w"]),
                        "s": max(0.0, float(w["s"]) - start_t),
                        "e": max(max(0.0, float(w["s"]) - start_t), float(w["e"]) - start_t)
                    }
                    for w in chunk.get("words", [])
                    if start_t - 0.5 <= float(w["s"]) <= end_t + 0.5
                ]

                hook_val, title_val = sanitize_hook_and_title(
                    c.get("hook"),
                    c.get("suggested_headline") or c.get("title"),
                    self.game
                )
                headline_val = title_val or hook_val

                # ALWAYS strictly respect the locked reframe coordinates across ALL chunks!
                locked_facecam = getattr(self, "facecam_box", None) or [1280, 0, 640, 480]
                locked_gameplay = getattr(self, "gameplay_box", None) or [0, 0, 1920, 1080]
                locked_split_pct = getattr(self, "split_pct", None) if getattr(self, "split_pct", None) is not None else 35
                locked_hook_y = getattr(self, "hook_y", None) if getattr(self, "hook_y", None) is not None else 672
                locked_cap_y = getattr(self, "cap_y", None) if getattr(self, "cap_y", None) is not None else 1728

                clip_meta = {
                    "start": 0.0,
                    "end": end_t - start_t,
                    "hook": headline_val,  # Burned onto video banner (suggested headline)
                    "headline": headline_val,
                    "title": headline_val,
                    "style": self.style,
                    "layout": self.layout,
                    "facecam": locked_facecam if self.layout == "splitscreen" else face_box,
                    "gameplay": locked_gameplay if self.layout == "splitscreen" else None,
                    "hook_y": locked_hook_y,
                    "cap_y": locked_cap_y,
                    "split_pct": locked_split_pct,
                    "captions": True,
                    "highlight_words": [w["w"] for w in c_words if len(w["w"]) > 4]
                }

                res = render.render_clip(piece, self.clips_dir, clip_stem, clip_meta, c_words, src_w, src_h)
                piece.unlink(missing_ok=True)

                finished_clip = {
                    "id": clip_stem,
                    "chunk_id": chunk_id,
                    "chunk_index": chunk_idx,
                    "batch_id": batch_id,
                    "session_id": self.id,
                    "stream_title": self.title,
                    "title": headline_val,
                    "headline": headline_val,
                    "hook": hook_val,
                    "score": int(c.get("score") or c.get("hook_score") or 95),
                    "game": self.game,
                    "duration": round(end_t - start_t, 1),
                    "video_url": f"/sniper/clips/{res['file']}",
                    "cover_url": f"/sniper/clips/{res['cover']}",
                    "created_at": time.time()
                }
                self.clips.append(finished_clip)
                if "clips" not in chunk:
                    chunk["clips"] = []
                chunk["clips"].append(finished_clip)
                save_clip_to_registry(finished_clip)
                rendered_count += 1
                chunk["clips_count"] = rendered_count
                save_vod_session_to_disk(self)
            except Exception as e:
                logger.error(f"Error rendering short {idx+1}/{total} ({clip_stem}): {e}")
                continue

        chunk["clips_count"] = rendered_count if rendered_count > 0 else len(clips_list)
        chunk["status"] = "done"
        self.status = "idle"
        self.stage = f"Complete! {rendered_count} shorts rendered and added to gallery."
        self.progress = 100
        save_vod_session_to_disk(self)

    def merge_chunks(self, indices: List[int]) -> str:
        """Joins transcripts of multiple 30m chunks (e.g. 1 hour) and generates a combined prompt."""
        valid_indices = sorted(i for i in indices if 0 <= i < len(self.chunks))
        if not valid_indices:
            raise ValueError("Select at least one chunk to merge.")

        combined_words = []
        labels = []
        for idx in valid_indices:
            c = self.chunks[idx]
            if not c.get("words"):
                raise ValueError(f"{c['label']} has not been transcribed yet. Transcribe it first before merging.")
            combined_words.extend(c["words"])
            labels.append(c["label"])

        merged_label = f"Merged: {labels[0]} to {labels[-1]}"
        merged_prompt = make_chunk_prompt(combined_words, self.title, self.game, merged_label, num_clips=len(valid_indices) * 4, uploader=self.uploader)
        self.merged_transcript = {
            "indices": valid_indices,
            "label": merged_label,
            "words": combined_words,
            "prompt": merged_prompt
        }
        return merged_prompt
