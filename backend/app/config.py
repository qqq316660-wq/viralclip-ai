import os
import shutil
from pathlib import Path

# Clean PATH to prevent Windows WinError 448 (untrusted junction mount point traversal)
clean_paths = []
for p in os.environ.get("PATH", "").split(os.pathsep):
    if not p:
        continue
    p_lower = p.lower()
    if ".mavis" in p_lower:
        continue
    try:
        if os.path.exists(p):
            clean_paths.append(p)
    except OSError:
        continue
os.environ["PATH"] = os.pathsep.join(clean_paths)

# Base Directories
BASE_DIR = Path(__file__).resolve().parent.parent.parent
STORAGE_DIR = BASE_DIR / "storage"


DOWNLOADS_DIR = STORAGE_DIR / "downloads"
AUDIO_DIR = STORAGE_DIR / "audio"
CLIPS_DIR = STORAGE_DIR / "clips"
FONTS_DIR = STORAGE_DIR / "fonts"

for directory in [DOWNLOADS_DIR, AUDIO_DIR, CLIPS_DIR, FONTS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Hardware Detection
def detect_device() -> str:
    try:
        import ctranslate2
        cuda_count = ctranslate2.get_cuda_device_count()
        if cuda_count > 0:
            return "cuda"
    except Exception:
        pass
    return "cpu"

DEVICE = detect_device()
COMPUTE_TYPE = "float16" if DEVICE == "cuda" else "int8"

# Check FFmpeg (prioritize bundled ffmpeg, then system PATH)
bundled_ffmpeg = BASE_DIR / "ffmpeg" / "ffmpeg.exe"
bundled_ffprobe = BASE_DIR / "ffmpeg" / "ffprobe.exe"
FFMPEG_PATH = str(bundled_ffmpeg) if bundled_ffmpeg.exists() else (shutil.which("ffmpeg") or "ffmpeg")
FFPROBE_PATH = str(bundled_ffprobe) if bundled_ffprobe.exists() else (shutil.which("ffprobe") or "ffprobe")

# Check Node.js runtime for solving YouTube BotGuard & signature challenges
bundled_node = BASE_DIR / "tools" / "node.exe"
installed_node = Path(r"C:\Program Files\nodejs\node.exe")
NODE_PATH = str(bundled_node) if bundled_node.exists() else (str(installed_node) if installed_node.exists() else shutil.which("node"))

# YouTube cookies file
COOKIES_FILE = STORAGE_DIR / "cookies.txt"

# Default Model settings
DEFAULT_WHISPER_MODEL = "medium"

# Portable Model Cache detection
LOCAL_MODELS_PATH = BASE_DIR / "models"
if LOCAL_MODELS_PATH.exists():
    os.environ.setdefault("HF_HOME", str(LOCAL_MODELS_PATH))
    os.environ.setdefault("HF_HUB_CACHE", str(LOCAL_MODELS_PATH / "hub"))
else:
    # Reuse AutoClip cached models if present on this machine
    AUTOCLIP_MODELS_PATH = Path("C:/Users/Akash/AppData/Local/Programs/Autoclip v2/models/hub")
    if AUTOCLIP_MODELS_PATH.exists():
        os.environ.setdefault("HF_HUB_CACHE", str(AUTOCLIP_MODELS_PATH))
