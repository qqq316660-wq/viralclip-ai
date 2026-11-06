import sys
from pathlib import Path
import uvicorn

# Ensure backend directory is in sys.path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import os
reload_mode = os.environ.get("VIRALCLIP_DEBUG", "0") == "1"

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8001, reload=reload_mode)
