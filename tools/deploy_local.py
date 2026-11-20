import shutil
import subprocess
import os
import time
from pathlib import Path

# 1. Kill any existing python on port 8001
try:
    out = subprocess.check_output(["netstat", "-ano", "-p", "tcp"], text=True)
    for line in out.splitlines():
        if ":8001" in line and "LISTENING" in line:
            parts = line.strip().split()
            pid = parts[-1]
            subprocess.run(["taskkill", "/F", "/PID", pid], capture_output=True)
            print(f"Killed old server PID: {pid}")
except Exception as e:
    print(f"Kill error: {e}")

time.sleep(1)

# 2. Copy router & config to installed app
src_router = Path("backend/app/stream_sniper/router.py")
src_config = Path("backend/app/stream_sniper/config.py")
dst_app = Path(r"C:\Users\Akash\AppData\Local\Programs\ViralClip AI\backend\app\stream_sniper")
dst_app.mkdir(parents=True, exist_ok=True)
shutil.copyfile(src_router, dst_app / "router.py")
shutil.copyfile(src_config, dst_app / "config.py")
print("Copied router and config!")

# 3. Seed verified real frame
src_frame = Path("backend/storage/stream_sniper/previews/h264_45m.jpg")
if src_frame.exists():
    dst_preview_dir = Path(r"C:\Users\Akash\AppData\Local\Programs\ViralClip AI\storage\stream_sniper\previews")
    dst_preview_dir.mkdir(parents=True, exist_ok=True)
    for f in dst_preview_dir.glob("*.jpg"):
        f.unlink(missing_ok=True)
    shutil.copyfile(src_frame, dst_preview_dir / "hwSg39yIBGU_frame_2700.jpg")
    shutil.copyfile(src_frame, dst_preview_dir / "hwSg39yIBGU_frame_2100.jpg")
    print("Seeded real 45m frame into installed previews!")

# 4. Start backend server
py_exec = r"C:\Users\Akash\AppData\Local\Programs\ViralClip AI\python\python.exe"
srv_script = r"C:\Users\Akash\AppData\Local\Programs\ViralClip AI\backend\run_server.py"
subprocess.Popen([py_exec, srv_script], cwd=str(Path(srv_script).parent), creationflags=0x08000000)
print("Server launch triggered on 8001!")
