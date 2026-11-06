# =====================================================================
# ViralClip AI - Whisper Large-V3 Kaggle Free GPU Server (All-in-One)
# =====================================================================
import os, sys, shutil, tempfile, subprocess, time, re, socket, uuid, threading

# 1. Ensure modern PyAV and faster-whisper are installed and up to date
# Note: "av>=11.0.0" is strictly required by modern faster-whisper to support
# metadata_errors in av.open without crashing on Kaggle/Colab!
print("📦 Installing/verifying dependencies (av>=11.0.0, faster-whisper, fastapi, uvicorn)...")
subprocess.check_call([
    sys.executable, "-m", "pip", "install", "-q", "-U",
    "av>=11.0.0",
    "faster-whisper",
    "fastapi",
    "uvicorn",
    "python-multipart"
])

# Safeguard against PyAV metadata_errors keyword mismatch across all versions
try:
    import av
    _orig_av_open = av.open
    def _safe_av_open(*args, **kwargs):
        try:
            return _orig_av_open(*args, **kwargs)
        except TypeError as e:
            if "metadata_errors" in str(e):
                kwargs.pop("metadata_errors", None)
                return _orig_av_open(*args, **kwargs)
            raise
    av.open = _safe_av_open

    # Also patch inside faster_whisper audio module
    import faster_whisper.audio
    faster_whisper.audio.av.open = _safe_av_open
except Exception as patch_err:
    pass

# 2. Download cloudflared binary
if not os.path.exists("./cloudflared-linux-amd64"):
    print("📥 Downloading Cloudflare binary...")
    os.system("wget -q -nc https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64")
    os.system("chmod +x cloudflared-linux-amd64")

from faster_whisper import WhisperModel
from fastapi import FastAPI, UploadFile, File
import uvicorn

app = FastAPI(title="Kaggle Whisper Large-V3 GPU Server")

# Check and Load Model on GPU
try:
    print("⚡ Loading Whisper Large-v3 on GPU (T4)...")
    model = WhisperModel("large-v3", device="cuda", compute_type="float16")
    print("✅ Whisper Large-v3 Model Ready on GPU!")
except Exception as e:
    print(f"\n⚠️ GPU initialization notice: {e}")
    print("⚡ Falling back to CPU mode...")
    model = WhisperModel("medium", device="cpu", compute_type="int8")
    print("✅ Whisper Model Ready on CPU!")

jobs_db = {}

def run_transcription_worker(job_id: str, file_path: str):
    try:
        print(f"⚙️ [Job {job_id}] Transcribing on GPU (Fast Turbo Mode)...")
        segments, info = model.transcribe(
            file_path,
            beam_size=1,
            best_of=1,
            word_timestamps=True,
            vad_filter=True,
            condition_on_previous_text=False
        )

        result_segments = []
        all_words = []

        for seg in segments:
            words = []
            if getattr(seg, "words", None):
                for w in seg.words:
                    word_item = {
                        "word": w.word.strip(),
                        "start": round(w.start, 3),
                        "end": round(w.end, 3)
                    }
                    words.append(word_item)
                    all_words.append(word_item)

            result_segments.append({
                "id": seg.id,
                "start": round(seg.start, 3),
                "end": round(seg.end, 3),
                "text": seg.text.strip(),
                "words": words
            })

        jobs_db[job_id] = {
            "status": "completed",
            "result": {
                "status": "success",
                "language": getattr(info, "language", "en"),
                "duration": round(getattr(info, "duration", 0.0), 2),
                "segments": result_segments,
                "words": all_words
            }
        }
        print(f"✅ [Job {job_id}] Complete! Duration: {round(getattr(info, 'duration', 0.0), 2)}s, Segments: {len(result_segments)}")
    except Exception as e:
        print(f"❌ [Job {job_id}] Failed: {e}")
        jobs_db[job_id] = {"status": "error", "error": str(e)}
    finally:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass

@app.get("/")
@app.get("/health")
def health_check():
    return {
        "status": "online",
        "service": "ViralClip AI Whisper Large-V3 Kaggle GPU Server",
        "gpu": True
    }

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    job_id = str(uuid.uuid4())[:8]
    print(f"📥 Received {file.filename} -> Assigned Job: {job_id}")
    ext = os.path.splitext(file.filename or "")[1] or ".mp3"
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    jobs_db[job_id] = {"status": "processing"}
    worker = threading.Thread(target=run_transcription_worker, args=(job_id, tmp_path), daemon=True)
    worker.start()

    return {
        "status": "processing",
        "job_id": job_id
    }

@app.get("/status/{job_id}")
def check_status(job_id: str):
    if job_id not in jobs_db:
        return {"status": "not_found"}
    return jobs_db[job_id]

# Cleanup old processes
os.system("pkill -9 -f cloudflared 2>/dev/null")
os.system("fuser -k 8000/tcp 2>/dev/null")

# Dynamically find free port
def get_free_port(preferred=8000):
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('127.0.0.1', preferred))
            return preferred
    except OSError:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('127.0.0.1', 0))
            return s.getsockname()[1]

LOCAL_PORT = get_free_port(8000)
print(f"🔌 Server binding on local port: {LOCAL_PORT}")

# Launch Cloudflare Tunnel
print("🚀 Starting Cloudflare Tunnel (HTTP/2 Mode)...")
log_file = open("cloudflared.log", "w")
cf_proc = subprocess.Popen(
    ["./cloudflared-linux-amd64", "tunnel", "--protocol", "http2", "--url", f"http://127.0.0.1:{LOCAL_PORT}"],
    stdout=log_file,
    stderr=subprocess.STDOUT
)

url = None
print("⏳ Waiting for Cloudflare Tunnel URL...")
for _ in range(30):
    time.sleep(1)
    if os.path.exists("cloudflared.log"):
        with open("cloudflared.log", "r") as f:
            content = f.read()
            match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", content)
            if match:
                url = match.group(0)
                break

if url:
    print("\n" + "="*65)
    print("🔥 YOUR PUBLIC KAGGLE WHISPER URL IS:")
    print(f"👉  {url}  👈")
    print("="*65)
    print("⚠️  KEEP THIS CELL RUNNING! Do NOT stop this cell.\n")
else:
    print("⚠️ Check cloudflared.log")

config = uvicorn.Config(app, host="127.0.0.1", port=LOCAL_PORT, log_level="info")
server = uvicorn.Server(config)
await server.serve()
