"""
ViralClip AI Studio - Developer OTA Update & Push Tool
Packages code changes from d:\\ns1 into lightweight (~2-3 MB) update patches
and generates the version.json manifest for your users.
"""

import os
import sys

# Configure UTF-8 stdout if possible on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
import json
import time
import shutil
import zipfile
import hashlib
import argparse
from pathlib import Path
from http.server import HTTPServer, SimpleHTTPRequestHandler
import threading

ROOT_DIR = Path(__file__).resolve().parent.parent
UPDATES_OUT_DIR = ROOT_DIR / "updates"
UPDATES_OUT_DIR.mkdir(parents=True, exist_ok=True)

VERSION_FILE = ROOT_DIR / "VERSION"
LOCAL_INSTALLED_DIR = Path(os.environ.get("LOCALAPPDATA", "")) / "Programs" / "ViralClip AI"

def get_current_version() -> str:
    if VERSION_FILE.exists():
        try:
            return VERSION_FILE.read_text(encoding="utf-8").strip()
        except Exception:
            pass
    return "1.6.0"

def calculate_sha256(file_path: Path) -> str:
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def build_frontend():
    """Builds the frontend production SPA using Vite."""
    frontend_dir = ROOT_DIR / "frontend"
    if not (frontend_dir / "package.json").exists():
        print("[!] frontend/package.json not found, skipping build.")
        return False
    print("--> Building frontend SPA (npm run build)...")
    res = os.system(f'cd /d "{frontend_dir}" && npm run build')
    return res == 0

def package_update(
    new_version: str,
    title: str,
    changelog: list,
    download_url_template: str = "",
    deploy_local: bool = False,
    include_node: bool = False
) -> Path:
    """
    Packages backend/app, web dist, tools, and VERSION into a small zip.
    """
    zip_filename = f"ViralClip-Update-{new_version}.zip"
    out_zip = UPDATES_OUT_DIR / zip_filename

    print(f"\n========================================================")
    print(f" Packaging ViralClip AI Update v{new_version}")
    print(f"========================================================")

    # 1. Update VERSION file
    VERSION_FILE.write_text(new_version, encoding="utf-8")
    print(f"[*] Updated VERSION to {new_version}")

    # 2. Collect files to include
    files_to_pack = []

    # Backend Python App
    backend_app = ROOT_DIR / "backend" / "app"
    if backend_app.exists():
        for root, _, files in os.walk(backend_app):
            if "__pycache__" in root or ".git" in root:
                continue
            for f in files:
                if f.endswith((".pyc", ".tmp")):
                    continue
                fp = Path(root) / f
                rel = fp.relative_to(ROOT_DIR)
                files_to_pack.append((fp, rel))

    # Backend requirements
    req_file = ROOT_DIR / "backend" / "requirements.txt"
    if req_file.exists():
        files_to_pack.append((req_file, Path("backend/requirements.txt")))

    # Web UI (prefer frontend/dist, fallback to web)
    frontend_dist = ROOT_DIR / "frontend" / "dist"
    web_dir = ROOT_DIR / "web"
    if frontend_dist.exists():
        for root, _, files in os.walk(frontend_dist):
            for f in files:
                fp = Path(root) / f
                rel = fp.relative_to(frontend_dist)
                files_to_pack.append((fp, Path("web") / rel))
    elif web_dir.exists():
        for root, _, files in os.walk(web_dir):
            for f in files:
                fp = Path(root) / f
                rel = fp.relative_to(web_dir)
                files_to_pack.append((fp, Path("web") / rel))

    # Tools (scripts, updater, license manager; exclude large node.exe unless --include-node)
    tools_dir = ROOT_DIR / "tools"
    if tools_dir.exists():
        for root, _, files in os.walk(tools_dir):
            if "__pycache__" in root:
                continue
            for f in files:
                if f.endswith((".pyc", ".tmp", ".csv", ".txt")):
                    continue
                if f in ("license_manager.py", "push_update.py"):
                    continue
                if f.lower() == "node.exe" and not include_node:
                    continue
                fp = Path(root) / f
                rel = fp.relative_to(ROOT_DIR)
                files_to_pack.append((fp, rel))

    # VERSION file
    files_to_pack.append((VERSION_FILE, Path("VERSION")))

    # 3. Create the update zip archive
    if out_zip.exists():
        out_zip.unlink()

    print(f"[*] Compressing {len(files_to_pack)} updated application files...")
    with zipfile.ZipFile(out_zip, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for file_path, arc_name in files_to_pack:
            zf.write(file_path, str(arc_name))

    zip_size_bytes = out_zip.stat().st_size
    zip_size_mb = zip_size_bytes / (1024 * 1024)
    sha256_hash = calculate_sha256(out_zip)

    print(f"[OK] Created update package: {out_zip.name} ({zip_size_mb:.2f} MB)")
    print(f"[OK] SHA-256 Checksum: sha256:{sha256_hash}")

    # 4. Determine download URL
    dl_url = download_url_template
    if not dl_url:
        dl_url = f"https://raw.githubusercontent.com/qqq316660-wq/viralclip-ai/main/updates/{zip_filename}"

    # 5. Generate version.json manifest
    manifest = {
        "version": new_version,
        "min_version": "1.0.0",
        "release_date": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "title": title or f"ViralClip AI Update v{new_version}",
        "changelog": changelog if changelog else ["Maintenance and stability improvements."],
        "download_url": dl_url,
        "checksum": f"sha256:{sha256_hash}",
        "size_bytes": zip_size_bytes,
        "mandatory": False,
        "rollback_version": None
    }

    manifest_file = UPDATES_OUT_DIR / "version.json"
    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"[OK] Generated manifest: {manifest_file.name}")

    # 6. Deploy locally if requested
    if deploy_local:
        deploy_to_local_installation(new_version, files_to_pack)

    return out_zip

def deploy_to_local_installation(version_str: str, files: list):
    """Directly copies the updated files into the user's installed program directory."""
    if not LOCAL_INSTALLED_DIR.exists():
        print(f"[!] Local installed directory not found: {LOCAL_INSTALLED_DIR}")
        return

    print(f"\n--> Deploying v{version_str} directly to local installation...")
    count = 0
    for src_path, arc_name in files:
        target_path = LOCAL_INSTALLED_DIR / arc_name
        target_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            shutil.copy2(src_path, target_path)
            count += 1
        except Exception as e:
            print(f"[!] Could not copy {arc_name}: {e}")

    # Write installed_version.txt
    try:
        (LOCAL_INSTALLED_DIR / "storage" / "installed_version.txt").write_text(version_str, encoding="utf-8")
        (LOCAL_INSTALLED_DIR / "VERSION").write_text(version_str, encoding="utf-8")
    except Exception:
        pass

    print(f"[OK] Successfully deployed {count} files to local installation!")
    print(f"    Path: {LOCAL_INSTALLED_DIR}")

def create_rollback_manifest(target_version: str, reason: str = ""):
    """Creates a version.json directing all clients to rollback to target_version."""
    manifest_file = UPDATES_OUT_DIR / "version.json"
    manifest = {
        "version": get_current_version(),
        "rollback_version": target_version,
        "release_date": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "title": f"Rollback Notice: Reverting to v{target_version}",
        "changelog": [reason or f"Emergency rollback to stable version {target_version}."],
        "mandatory": True
    }
    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"\n[OK] Rollback directive created!")
    print(f"    Target Rollback Version: v{target_version}")
    print(f"    Manifest written to: {manifest_file}")
    print(f"    Upload this version.json to your update server to trigger rollback on user machines.")

def run_local_test_server(port: int = 8085):
    """Starts a local HTTP server hosting updates/ for testing in-app updates."""
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(UPDATES_OUT_DIR), **kwargs)

    server = HTTPServer(("127.0.0.1", port), Handler)
    print(f"\n========================================================")
    print(f" Local Update Test Server Running!")
    print(f" Manifest URL: http://127.0.0.1:{port}/version.json")
    print(f" Press Ctrl+C to stop.")
    print(f"========================================================\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping local update server.")

def main():
    parser = argparse.ArgumentParser(description="ViralClip AI OTA Update Publisher")
    parser.add_argument("--version", "-v", help="New version string (e.g. 1.6.1)")
    parser.add_argument("--title", "-t", help="Update title")
    parser.add_argument("--changelog", "-c", nargs="+", help="Changelog bullet points")
    parser.add_argument("--url", "-u", help="Direct download URL for the update zip")
    parser.add_argument("--no-build", action="store_true", help="Skip npm run build")
    parser.add_argument("--include-node", action="store_true", help="Include 80MB node.exe in patch (usually not needed for minor updates)")
    parser.add_argument("--deploy-local", action="store_true", help="Deploy directly to local installed app")
    parser.add_argument("--rollback", help="Issue a rollback directive to this version (e.g. 1.6.0)")
    parser.add_argument("--rollback-reason", help="Reason for rollback")
    parser.add_argument("--host-local", action="store_true", help="Start local test server on port 8085")
    parser.add_argument("--port", type=int, default=8085, help="Port for local test server")

    args = parser.parse_args()

    # Handle local server mode
    if args.host_local:
        run_local_test_server(args.port)
        return

    # Handle rollback directive mode
    if args.rollback:
        create_rollback_manifest(args.rollback, args.rollback_reason or "Stability rollback requested by developer.")
        return

    cur_ver = get_current_version()
    new_ver = args.version
    title = args.title
    changelog = args.changelog

    # If running interactively
    if not new_ver:
        print("========================================================")
        print("      ViralClip AI - Live OTA Update Creator            ")
        print("========================================================")
        print(f" Current Workspace Version: {cur_ver}")
        
        # Suggest next patch version
        parts = cur_ver.split(".")
        if len(parts) == 3 and parts[2].isdigit():
            suggested = f"{parts[0]}.{parts[1]}.{int(parts[2]) + 1}"
        else:
            suggested = "1.6.1"

        inp_ver = input(f" Enter new version [{suggested}]: ").strip()
        new_ver = inp_ver if inp_ver else suggested

        inp_title = input(f" Enter update title [Bug Fixes & Performance Improvements]: ").strip()
        title = inp_title if inp_title else "Bug Fixes & Performance Improvements"

        print(" Enter changelog bullet points (one per line, leave blank and press Enter to finish):")
        changelog = []
        while True:
            line = input("  * ").strip()
            if not line:
                break
            changelog.append(line)
        if not changelog:
            changelog = ["Fixed minor issues and improved application stability."]

    # Step 1: Build frontend if needed
    if not args.no_build:
        build_frontend()

    # Step 2: Package update zip and version.json
    package_update(
        new_version=new_ver,
        title=title,
        changelog=changelog,
        download_url_template=args.url or "",
        deploy_local=args.deploy_local,
        include_node=args.include_node
    )

    print("\n========================================================")
    print(" Update Packaging Complete!")
    print(f" Files saved in: {UPDATES_OUT_DIR}")
    print(f"  1. ViralClip-Update-{new_ver}.zip (~2.5 MB)")
    print(f"  2. version.json (Manifest)")
    print("========================================================")
    print(" Next Steps to Deliver this Update to Users:")
    print("   Option 1: Upload version.json & .zip to GitHub Releases:")
    print("             https://github.com/Akash-ViralClip/viralclip-updates/releases")
    print("   Option 2: Test locally right now with:")
    print("             python tools/push_update.py --host-local")
    print("   Option 3: Push directly to your local installed app:")
    print(f"             python tools/push_update.py --version {new_ver} --deploy-local")
    print("========================================================\n")

if __name__ == "__main__":
    main()
