import os
import sys
import json
import time
import shutil
import zipfile
import hashlib
import threading
import urllib.request
from pathlib import Path
from typing import Dict, Any, Optional, List
from packaging import version

from app.config import BASE_DIR, STORAGE_DIR

# Dedicated directories for updates and backups
UPDATES_DIR = STORAGE_DIR / "updates"
BACKUPS_DIR = STORAGE_DIR / "backups"
CONFIG_FILE = STORAGE_DIR / "update_config.json"
VERSION_FILE = BASE_DIR / "VERSION"
INSTALLED_VER_FILE = STORAGE_DIR / "installed_version.txt"

UPDATES_DIR.mkdir(parents=True, exist_ok=True)
BACKUPS_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_CONFIG = {
    "enabled": True,
    "manifest_url": "https://raw.githubusercontent.com/qqq316660-wq/viralclip-ai/main/updates/version.json",
    "auto_check": True,
    "channel": "stable"
}

# In-memory status tracker for live UI progress
_update_lock = threading.Lock()
_current_task: Dict[str, Any] = {
    "state": "idle",       # idle | checking | downloading | backing_up | applying | completed | rolling_back | error
    "progress": 0,         # 0 - 100
    "message": "",
    "error": None,
    "target_version": None,
    "updated_at": time.time()
}

def set_status(state: str, progress: int = 0, message: str = "", error: Optional[str] = None, target_version: Optional[str] = None):
    with _update_lock:
        _current_task["state"] = state
        _current_task["progress"] = progress
        _current_task["message"] = message
        _current_task["error"] = error
        if target_version:
            _current_task["target_version"] = target_version
        _current_task["updated_at"] = time.time()

def get_status() -> Dict[str, Any]:
    with _update_lock:
        return dict(_current_task)

def reset_status():
    with _update_lock:
        _current_task["state"] = "idle"
        _current_task["progress"] = 0
        _current_task["message"] = ""
        _current_task["error"] = None
        _current_task["updated_at"] = time.time()

def get_current_version() -> str:
    """Reads current installed version of ViralClip AI Studio."""
    if VERSION_FILE.exists():
        try:
            ver = VERSION_FILE.read_text(encoding="utf-8").strip()
            if ver:
                return ver
        except Exception:
            pass
    if INSTALLED_VER_FILE.exists():
        try:
            ver = INSTALLED_VER_FILE.read_text(encoding="utf-8").strip()
            if ver:
                return ver
        except Exception:
            pass
    return "1.6.0"

def get_update_config() -> Dict[str, Any]:
    """Retrieves update settings, creating defaults if not present."""
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {**DEFAULT_CONFIG, **data}
        except Exception:
            pass
    return dict(DEFAULT_CONFIG)

def save_update_config(new_config: Dict[str, Any]) -> Dict[str, Any]:
    """Saves update settings."""
    cfg = get_update_config()
    cfg.update(new_config)
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2)
    except Exception as e:
        print(f"[Updater] Error saving config: {e}")
    return cfg

def calculate_sha256(file_path: Path) -> str:
    """Computes SHA-256 hash of a file."""
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def check_for_updates() -> Dict[str, Any]:
    """
    Checks the remote manifest URL to see if a newer version or rollback is available.
    """
    config = get_update_config()
    current_ver = get_current_version()
    backups = list_backups()
    can_rollback = len(backups) > 0
    latest_backup = backups[0] if backups else None

    if not config.get("enabled", True):
        return {
            "update_available": False,
            "current_version": current_ver,
            "message": "Updates are currently disabled in settings."
        }

    manifest_url = config.get("manifest_url", "").strip()
    if not manifest_url:
        return {
            "update_available": False,
            "current_version": current_ver,
            "message": "No update manifest URL configured."
        }

    # Clear any residual check-time error
    with _update_lock:
        if _current_task.get("state") == "error" and "check" in (_current_task.get("message") or "").lower():
            _current_task["state"] = "idle"
            _current_task["message"] = ""
            _current_task["error"] = None

    try:
        data = None
        # Support local file:// or direct file paths for local testing
        if manifest_url.startswith("file://") or os.path.exists(manifest_url):
            clean_local = manifest_url.replace("file:///", "").replace("file://", "")
            with open(clean_local, "r", encoding="utf-8") as f:
                data = json.load(f)
        else:
            try:
                req = urllib.request.Request(
                    manifest_url,
                    headers={"User-Agent": f"ViralClip-AI-Updater/{current_ver}"}
                )
                with urllib.request.urlopen(req, timeout=8) as res:
                    if res.status != 200:
                        raise RuntimeError(f"HTTP {res.status} from manifest server")
                    content = res.read().decode("utf-8")
                    data = json.loads(content)
            except Exception as net_err:
                # If remote GitHub manifest is 404/not yet published or offline,
                # check local updates/version.json in the project or installed directory:
                local_candidates = [
                    Path("d:/ns1/updates/version.json"),
                    BASE_DIR / "updates" / "version.json",
                    BASE_DIR.parent / "updates" / "version.json",
                    STORAGE_DIR / "updates" / "version.json",
                ]
                for cand in local_candidates:
                    if cand.exists():
                        try:
                            with open(cand, "r", encoding="utf-8") as f:
                                cand_data = json.load(f)
                            cand_ver = str(cand_data.get("version", "")).strip()
                            if cand_ver and (version.parse(cand_ver) > version.parse(current_ver) or cand_data.get("rollback_version")):
                                data = cand_data
                                # Ensure download_url points to a valid local file if remote is not accessible
                                cand_zip = cand.parent / f"ViralClip-Update-{cand_ver}.zip"
                                if cand_zip.exists():
                                    data["download_url"] = str(cand_zip.resolve())
                                print(f"[Updater] Detected local update package from {cand} (v{cand_ver})")
                                break
                        except Exception:
                            pass
                if not data:
                    raise net_err

        remote_ver = str(data.get("version", current_ver)).strip()
        rollback_ver = data.get("rollback_version")
        title = data.get("title", f"ViralClip AI v{remote_ver}")
        changelog = data.get("changelog", [])
        download_url = data.get("download_url", "")
        checksum = data.get("checksum", "")
        size_bytes = data.get("size_bytes", 0)
        mandatory = bool(data.get("mandatory", False))
        release_date = data.get("release_date", "")

        # Check for Developer-Broadcast Rollback directive
        if rollback_ver and rollback_ver.strip():
            target_rollback = rollback_ver.strip()
            # If current version is higher than rollback target, force or recommend rollback
            if version.parse(current_ver) > version.parse(target_rollback):
                return {
                    "update_available": False,
                    "rollback_required": True,
                    "rollback_target": target_rollback,
                    "current_version": current_ver,
                    "title": f"Rollback Notice: Revert to v{target_rollback}",
                    "changelog": [f"Developer issued a rollback to stable version {target_rollback}."],
                    "download_url": download_url,
                    "can_rollback": can_rollback,
                    "latest_backup": latest_backup
                }

        # Compare version semantically
        update_available = version.parse(remote_ver) > version.parse(current_ver)

        return {
            "update_available": update_available,
            "rollback_required": False,
            "current_version": current_ver,
            "latest_version": remote_ver,
            "title": title,
            "release_date": release_date,
            "changelog": changelog,
            "download_url": download_url,
            "checksum": checksum,
            "size_bytes": size_bytes,
            "mandatory": mandatory,
            "can_rollback": can_rollback,
            "latest_backup": latest_backup
        }

    except Exception as e:
        err_msg = str(e)
        print(f"[Updater] Notice during update check: {err_msg}")
        return {
            "update_available": False,
            "rollback_required": False,
            "current_version": current_ver,
            "server_unreachable": True,
            "server_message": "Remote manifest not found or update channel is up-to-date." if "404" in err_msg else "Could not reach update server.",
            "can_rollback": can_rollback,
            "latest_backup": latest_backup
        }

def create_backup(current_ver: str) -> Path:
    """
    Creates a safe rollback snapshot of all current application code (backend, web, tools, VERSION).
    """
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    backup_file = BACKUPS_DIR / f"backup_v{current_ver}_{timestamp}.zip"

    # Identify items to backup
    items_to_backup = []
    
    # 1. Backend python code
    backend_app = BASE_DIR / "backend" / "app"
    if backend_app.exists():
        items_to_backup.append((backend_app, Path("backend/app")))

    # 2. Web UI dist
    web_dir = BASE_DIR / "web"
    if web_dir.exists():
        items_to_backup.append((web_dir, Path("web")))
    frontend_dist = BASE_DIR / "frontend" / "dist"
    if frontend_dist.exists():
        items_to_backup.append((frontend_dist, Path("frontend/dist")))

    # 3. Tools
    tools_dir = BASE_DIR / "tools"
    if tools_dir.exists():
        items_to_backup.append((tools_dir, Path("tools")))

    # 4. Version file
    if VERSION_FILE.exists():
        items_to_backup.append((VERSION_FILE, Path("VERSION")))

    with zipfile.ZipFile(backup_file, "w", zipfile.ZIP_DEFLATED) as zf:
        for src_path, arc_prefix in items_to_backup:
            if src_path.is_file():
                zf.write(src_path, str(arc_prefix))
            elif src_path.is_dir():
                for root, _, files in os.walk(src_path):
                    if "__pycache__" in root or ".git" in root:
                        continue
                    for file in files:
                        if file.endswith((".pyc", ".tmp")):
                            continue
                        fp = Path(root) / file
                        rel = fp.relative_to(src_path)
                        arc_name = arc_prefix / rel
                        zf.write(fp, str(arc_name))

    # Keep a max of 5 historical backups to save disk space
    _prune_old_backups(max_keep=5)

    return backup_file

def _prune_old_backups(max_keep: int = 5):
    try:
        backups = sorted(BACKUPS_DIR.glob("backup_*.zip"), key=lambda p: p.stat().st_mtime, reverse=True)
        for old in backups[max_keep:]:
            old.unlink(missing_ok=True)
    except Exception:
        pass

def list_backups() -> List[Dict[str, Any]]:
    """Returns sorted list of available safe backup snapshots."""
    backups = []
    try:
        for p in sorted(BACKUPS_DIR.glob("backup_*.zip"), key=lambda x: x.stat().st_mtime, reverse=True):
            name = p.stem
            # format: backup_v1.6.0_20261104_120000
            parts = name.split("_")
            ver = parts[1].replace("v", "") if len(parts) > 1 else "unknown"
            backups.append({
                "filename": p.name,
                "version": ver,
                "created_at": time.ctime(p.stat().st_mtime),
                "size_bytes": p.stat().st_size
            })
    except Exception:
        pass
    return backups

def execute_update_job(download_url: str, expected_checksum: Optional[str] = None, target_ver: Optional[str] = None):
    """
    Downloads update package, verifies integrity, creates safe backup, extracts files, and marks complete.
    """
    current_ver = get_current_version()
    set_status("downloading", 5, "Connecting to update server...", target_version=target_ver)

    dest_zip = UPDATES_DIR / f"incoming_update_{target_ver or 'patch'}.zip"

    try:
        # Step 1: Download or copy package with progress
        if download_url.startswith("file://") or os.path.exists(download_url):
            clean_local = download_url.replace("file:///", "").replace("file://", "")
            shutil.copy2(clean_local, dest_zip)
            set_status("downloading", 60, "Loaded local update patch package...")
        else:
            req = urllib.request.Request(download_url, headers={"User-Agent": "ViralClip-AI-Updater"})
            with urllib.request.urlopen(req, timeout=30) as response, open(dest_zip, "wb") as out_file:
                total_size = int(response.headers.get("content-length", 0))
                downloaded = 0
                block_size = 65536

                while True:
                    buffer = response.read(block_size)
                    if not buffer:
                        break
                    downloaded += len(buffer)
                    out_file.write(buffer)
                    if total_size > 0:
                        pct = int(10 + (downloaded / total_size) * 50)
                        mb_cur = downloaded / (1024 * 1024)
                        mb_tot = total_size / (1024 * 1024)
                        set_status("downloading", min(pct, 60), f"Downloading patch ({mb_cur:.1f} MB / {mb_tot:.1f} MB)...")

        set_status("verifying", 65, "Verifying package integrity...")

        # Step 2: Checksum validation if specified
        if expected_checksum:
            expected_hash = expected_checksum.replace("sha256:", "").strip().lower()
            actual_hash = calculate_sha256(dest_zip).lower()
            if actual_hash != expected_hash:
                dest_zip.unlink(missing_ok=True)
                raise ValueError("Checksum verification failed! The downloaded update file may be corrupted.")

        # Step 3: Create safe rollback snapshot of existing application
        set_status("backing_up", 75, "Creating safe restore backup snapshot...")
        create_backup(current_ver)

        # Step 4: Extract and apply patch
        set_status("applying", 85, "Applying updated files (backend & web assets)...")

        with zipfile.ZipFile(dest_zip, "r") as zf:
            # Inspect entries
            for member in zf.namelist():
                # Prevent zip slip
                target_path = (BASE_DIR / member).resolve()
                if not str(target_path).startswith(str(BASE_DIR.resolve())):
                    continue

                if member.endswith("/"):
                    target_path.mkdir(parents=True, exist_ok=True)
                else:
                    target_path.parent.mkdir(parents=True, exist_ok=True)
                    with zf.open(member) as source, open(target_path, "wb") as target:
                        shutil.copyfileobj(source, target)

                # If zip contains 'web/' but client is dev running 'frontend/dist', mirror it
                if member.startswith("web/") and (BASE_DIR / "frontend" / "dist").exists():
                    rel_sub = member[4:]
                    dev_target = BASE_DIR / "frontend" / "dist" / rel_sub
                    if not member.endswith("/"):
                        dev_target.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(target_path, dev_target)

        # Update local VERSION files
        new_ver_str = target_ver or "updated"
        try:
            VERSION_FILE.write_text(new_ver_str, encoding="utf-8")
        except Exception:
            pass
        try:
            INSTALLED_VER_FILE.write_text(new_ver_str, encoding="utf-8")
        except Exception:
            pass

        # Cleanup downloaded zip
        dest_zip.unlink(missing_ok=True)

        set_status(
            "completed",
            100,
            f"Update v{new_ver_str} installed successfully! Restarting studio...",
            target_version=new_ver_str
        )

    except Exception as e:
        err_msg = str(e)
        print(f"[Updater] Update failed: {err_msg}")
        set_status("error", 0, f"Update failed: {err_msg}", error=err_msg)

def execute_rollback_job(backup_filename: Optional[str] = None):
    """
    Rolls back the application to a previous backup snapshot.
    """
    set_status("rolling_back", 10, "Locating backup archive...")

    try:
        backups = list_backups()
        if not backups:
            raise RuntimeError("No backup snapshots found to restore.")

        selected_backup = None
        if backup_filename:
            target = BACKUPS_DIR / backup_filename
            if target.exists():
                selected_backup = target
        if not selected_backup:
            selected_backup = BACKUPS_DIR / backups[0]["filename"]

        set_status("rolling_back", 40, f"Restoring from {selected_backup.name}...")

        with zipfile.ZipFile(selected_backup, "r") as zf:
            for member in zf.namelist():
                target_path = (BASE_DIR / member).resolve()
                if not str(target_path).startswith(str(BASE_DIR.resolve())):
                    continue
                if member.endswith("/"):
                    target_path.mkdir(parents=True, exist_ok=True)
                else:
                    target_path.parent.mkdir(parents=True, exist_ok=True)
                    with zf.open(member) as source, open(target_path, "wb") as target:
                        shutil.copyfileobj(source, target)

        restored_ver = get_current_version()
        set_status(
            "completed",
            100,
            f"Rollback to v{restored_ver} completed successfully! Restarting studio...",
            target_version=restored_ver
        )

    except Exception as e:
        err_msg = str(e)
        print(f"[Updater] Rollback error: {err_msg}")
        set_status("error", 0, f"Rollback failed: {err_msg}", error=err_msg)

def restart_studio():
    """
    Safely triggers a delayed application restart via PowerShell / VBS launcher and terminates server.
    """
    def _restart():
        time.sleep(1.0)
        try:
            launcher_vbs = BASE_DIR / "ViralClip.vbs"
            launcher_bat = BASE_DIR / "start_viralclip.bat"
            if launcher_vbs.exists():
                os.system(f'wscript.exe "{launcher_vbs}"')
            elif launcher_bat.exists():
                os.system(f'cmd.exe /c "{launcher_bat}"')
        except Exception:
            pass
        os._exit(0)

    t = threading.Thread(target=_restart, daemon=True)
    t.start()
