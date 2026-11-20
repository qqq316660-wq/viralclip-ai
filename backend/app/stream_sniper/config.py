"""
Stream Sniper Configuration - PeakCut Architecture
"""
import json
import os
import shutil
import subprocess
from pathlib import Path

OUT_W = 1080
OUT_H = 1920
OUT_FPS = 30

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
STORAGE_DIR = BASE_DIR / "storage"
FONTS_DIR = STORAGE_DIR / "fonts"
MODELS_DIR = STORAGE_DIR / "models"
MODEL_NAME = "sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8"
MODEL_DIR = MODELS_DIR / MODEL_NAME

SNIPER_DIR = STORAGE_DIR / "stream_sniper"
BUFFER_DIR = SNIPER_DIR / "buffer"
CLIPS_DIR = STORAGE_DIR / "clips" / "sniper"
KEYS_FILE = STORAGE_DIR / "sniper_ai_keys.json"

for d in (STORAGE_DIR, FONTS_DIR, MODELS_DIR, SNIPER_DIR, BUFFER_DIR, CLIPS_DIR):
    d.mkdir(parents=True, exist_ok=True)

# Add bundled ffmpeg to PATH if present
bundled_ffmpeg_dir = BASE_DIR / "ffmpeg"
if bundled_ffmpeg_dir.exists() and str(bundled_ffmpeg_dir) not in os.environ.get("PATH", ""):
    os.environ["PATH"] = str(bundled_ffmpeg_dir) + os.pathsep + os.environ.get("PATH", "")

# Detect ffmpeg path
def _find_ffmpeg() -> str:
    bundled = BASE_DIR / "ffmpeg" / "ffmpeg.exe"
    if bundled.exists():
        return str(bundled)
    which_ffmpeg = shutil.which("ffmpeg")
    if which_ffmpeg:
        return which_ffmpeg
    candidates = [
        Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft/WinGet/Packages",
        BASE_DIR / "bin",
        Path("C:/ffmpeg/bin"),
    ]
    for c in candidates:
        if c.is_dir():
            found = list(c.glob("**/ffmpeg.exe"))
            if found:
                return str(found[0])
    return "ffmpeg"

FFMPEG_PATH = _find_ffmpeg()
NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)

# Multi-AI Brain Keys
GROQ_KEY = os.environ.get("GROQ_API_KEY", "")
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
OPENAI_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENROUTER_KEY = os.environ.get("OPENROUTER_API_KEY", "")


def load_keys():
    global GROQ_KEY, GEMINI_KEY, OPENAI_KEY, OPENROUTER_KEY
    if KEYS_FILE.exists():
        try:
            data = json.loads(KEYS_FILE.read_text(encoding="utf-8"))
            GROQ_KEY = (data.get("groq") or "").strip()
            GEMINI_KEY = (data.get("gemini") or "").strip()
            OPENAI_KEY = (data.get("openai") or "").strip()
            OPENROUTER_KEY = (data.get("openrouter") or "").strip()
        except Exception:
            pass


def save_keys():
    data = {
        "groq": GROQ_KEY,
        "gemini": GEMINI_KEY,
        "openai": OPENAI_KEY,
        "openrouter": OPENROUTER_KEY,
    }
    KEYS_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def get_api_keys():
    return {
        "groq": GROQ_KEY,
        "gemini": GEMINI_KEY,
        "openai": OPENAI_KEY,
        "openrouter": OPENROUTER_KEY,
    }


load_keys()
