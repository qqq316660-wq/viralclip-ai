import asyncio
import os
import shutil
import uuid
from pathlib import Path
from typing import List, Dict, Any
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import (
    BASE_DIR,
    STORAGE_DIR,
    DOWNLOADS_DIR,
    CLIPS_DIR,
    DEVICE,
    COMPUTE_TYPE,
    FFMPEG_PATH,
    COOKIES_FILE,
)
from app.models import (
    CreateJobRequest,
    JobResponse,
    VideoInfoRequest,
    VideoInfoResponse,
    SubmitClipsRequest,
    GeneratePromptRequest,
    JobStatus,
    ActivateLicenseRequest,
    LicenseStatusResponse,
)
from app.licensing import (
    get_hardware_id,
    get_local_license,
    verify_and_activate_with_firebase,
    check_internet_connectivity,
)
from app.jobs import (
    create_job,
    get_job,
    get_all_jobs,
    delete_job,
    delete_clip,
    run_pipeline,
    resume_job_with_custom_clips,
    resume_job_with_heuristic,
    save_jobs_to_disk,
    jobs_internal_data,
    get_storage_videos_history,
    delete_storage_video,
)
from app.downloader import get_video_info
from app.selector import parse_llm_clips_json, generate_ai_prompt
from app.srt_parser import parse_srt_file

app = FastAPI(
    title="ViralClip AI API",
    description="High-performance backend for automated AI video clipping & viral short creation",
    version="1.7.1"
)

# Secure CORS policy: Restricts cross-origin requests exclusively to local app origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:8001",
        "http://localhost:8001",
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1",
        "http://localhost",
        "null"
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "ViralClip AI"}

@app.get("/api/license/status", response_model=LicenseStatusResponse)
async def check_license_status():
    """
    Check current machine activation status.
    Runs 100% OFFLINE by reading locally signed license token.
    """
    hwid = get_hardware_id()
    local_lic = get_local_license()
    if local_lic:
        return LicenseStatusResponse(
            is_activated=True,
            license_key=local_lic.get("key"),
            registered_name=local_lic.get("registered_name"),
            registered_phone=local_lic.get("registered_phone"),
            hwid=hwid,
            offline_ready=True,
            status="active",
            message="License activated and hardware locked"
        )
    return LicenseStatusResponse(
        is_activated=False,
        hwid=hwid,
        offline_ready=True,
        status="unlicensed",
        message="License activation required"
    )

@app.post("/api/license/activate")
async def activate_license(request: ActivateLicenseRequest):
    """
    Activate and bind license key to this machine's HWID using Firebase.
    Requires one-time internet connection.
    """
    if not request.license_key or not request.license_key.strip():
        raise HTTPException(status_code=400, detail="License key is required.")
    
    success, message, lic_data = verify_and_activate_with_firebase(
        license_key=request.license_key.strip(),
        name=request.name.strip(),
        phone=request.phone.strip()
    )
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {
        "success": True,
        "message": message,
        "license": lic_data
    }

@app.get("/api/license/check-internet")
async def test_internet():
    """Quick check for internet availability before activation."""
    online = check_internet_connectivity(timeout=2.5)
    return {"online": online}


@app.get("/api/system")
async def system_info():
    return {
        "device": DEVICE,
        "compute_type": COMPUTE_TYPE,
        "ffmpeg_available": bool(shutil.which(FFMPEG_PATH)),
        "ffmpeg_path": FFMPEG_PATH,
        "storage": {
            "downloads": str(DOWNLOADS_DIR),
            "clips": str(CLIPS_DIR),
        }
    }

@app.get("/api/cookies/status")
async def get_cookies_status():
    if COOKIES_FILE.exists() and COOKIES_FILE.stat().st_size > 10:
        content = COOKIES_FILE.read_text(encoding="utf-8", errors="ignore")
        lines = [l for l in content.splitlines() if l.strip() and not l.startswith("#")]
        return {
            "has_cookies": True,
            "filename": COOKIES_FILE.name,
            "size_bytes": COOKIES_FILE.stat().st_size,
            "cookie_count": len(lines)
        }
    return {
        "has_cookies": False,
        "filename": None,
        "size_bytes": 0,
        "cookie_count": 0
    }

@app.post("/api/cookies/upload")
async def upload_cookies(file: UploadFile = File(...)):
    content = await file.read()
    with open(COOKIES_FILE, "wb") as f:
        f.write(content)
    text = content.decode("utf-8", errors="ignore")
    lines = [l for l in text.splitlines() if l.strip() and not l.startswith("#")]
    return {
        "status": "ok",
        "has_cookies": True,
        "cookie_count": len(lines),
        "message": f"Successfully loaded {len(lines)} YouTube session cookies."
    }

@app.post("/api/cookies/paste")
async def paste_cookies(body: Dict[str, str]):
    c_text = body.get("cookies_text", "").strip()
    if not c_text:
        raise HTTPException(status_code=400, detail="Cookies text cannot be empty")
    COOKIES_FILE.write_text(c_text, encoding="utf-8")
    lines = [l for l in c_text.splitlines() if l.strip() and not l.startswith("#")]
    return {
        "status": "ok",
        "has_cookies": True,
        "cookie_count": len(lines),
        "message": f"Successfully saved {len(lines)} YouTube cookies."
    }

@app.delete("/api/cookies")
async def delete_cookies():
    if COOKIES_FILE.exists():
        COOKIES_FILE.unlink()
    return {"status": "ok", "has_cookies": False}

# =========================================================================
# Over-The-Air (OTA) Live Update & Rollback System
# =========================================================================
from app.updater import (
    get_current_version,
    get_update_config,
    save_update_config,
    check_for_updates,
    get_status as get_updater_status,
    reset_status as reset_updater_status,
    execute_update_job,
    execute_rollback_job,
    list_backups,
    restart_studio
)

@app.get("/api/updater/version")
async def get_app_version():
    return {"version": get_current_version()}

@app.get("/api/updater/check")
async def check_updates_endpoint():
    return await asyncio.to_thread(check_for_updates)

@app.get("/api/updater/status")
async def get_update_status_endpoint():
    return get_updater_status()

@app.post("/api/updater/install")
async def install_update_endpoint(body: Dict[str, Any], background_tasks: BackgroundTasks):
    download_url = body.get("download_url")
    if not download_url:
        raise HTTPException(status_code=400, detail="download_url is required")
    checksum = body.get("checksum")
    target_ver = body.get("version")

    background_tasks.add_task(execute_update_job, download_url, checksum, target_ver)
    return {"status": "started", "message": "Update process started"}

@app.post("/api/updater/rollback")
async def rollback_update_endpoint(body: Dict[str, Any], background_tasks: BackgroundTasks):
    backup_filename = body.get("backup_filename")
    background_tasks.add_task(execute_rollback_job, backup_filename)
    return {"status": "started", "message": "Rollback process started"}

@app.get("/api/updater/backups")
async def get_backups_endpoint():
    return {"backups": list_backups(), "current_version": get_current_version()}

@app.get("/api/updater/config")
async def get_update_config_endpoint():
    return get_update_config()

@app.post("/api/updater/config")
async def save_update_config_endpoint(body: Dict[str, Any]):
    return save_update_config(body)

@app.post("/api/updater/restart")
async def restart_app_endpoint():
    restart_studio()
    return {"status": "restarting"}

@app.post("/api/updater/dismiss-error")
async def dismiss_updater_error():
    reset_updater_status()
    return {"status": "ok"}

@app.post("/api/video-info", response_model=VideoInfoResponse)
async def fetch_video_info(request: VideoInfoRequest):
    """
    Fetches video metadata and available qualities from YouTube or web video link.
    """
    if not request.url or not request.url.strip():
        raise HTTPException(status_code=400, detail="Video URL is required")
    try:
        info = await asyncio.to_thread(get_video_info, request.url.strip())
        return info
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not inspect video: {str(e)}")

@app.post("/api/upload")
async def upload_video(file: UploadFile = File(...)):
    """
    Handles local video file uploads.
    """
    ext = Path(file.filename).suffix.lower()
    allowed_exts = [
        ".mp4", ".mov", ".mkv", ".avi", ".webm",
        ".srt", ".vtt", ".json",
        ".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac",
        ".png", ".jpg", ".jpeg", ".webp", ".svg"
    ]
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"Unsupported format. Allowed: {allowed_exts}")

    upload_id = f"up_{uuid.uuid4().hex[:8]}"
    destination = DOWNLOADS_DIR / f"{upload_id}{ext}"

    with open(destination, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "status": "success",
        "upload_id": upload_id,
        "filename": file.filename,
        "size_bytes": destination.stat().st_size
    }

@app.post("/api/jobs", response_model=JobResponse)
async def start_job(request: CreateJobRequest, background_tasks: BackgroundTasks):
    """
    Initiates video ingestion, transcription, viral clip selection, and rendering.
    """
    if not request.video_url and not request.upload_id and not request.reuse_job_id and not request.reuse_video_id:
        raise HTTPException(status_code=400, detail="Must provide video_url, upload_id, or select a stored video from history")

    job = create_job(request)
    background_tasks.add_task(run_pipeline, job.job_id, request)
    return job

@app.get("/api/history/videos")
async def list_history_videos():
    """
    Returns list of already processed/downloaded videos in storage with transcription state.
    """
    return get_storage_videos_history()

@app.delete("/api/history/videos/{video_id}")
async def remove_history_video(video_id: str):
    """
    Deletes a stored video and associated cache files from storage.
    """
    success = delete_storage_video(video_id)
    return {"status": "ok", "deleted": success, "video_id": video_id}

@app.get("/api/jobs", response_model=List[JobResponse])
async def list_all_jobs():
    """
    Fetches all saved jobs and shorts projects in the local library.
    """
    return get_all_jobs()

@app.get("/api/jobs/{job_id}", response_model=JobResponse)
async def check_job(job_id: str):
    """
    Fetches live progress and candidate clips for a job.
    """
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@app.delete("/api/jobs/{job_id}")
async def remove_job(job_id: str):
    """
    Deletes a saved job and its clips from local storage.
    """
    success = delete_job(job_id)
    return {"status": "ok", "deleted_job_id": job_id, "deleted": success}

@app.post("/api/jobs/bulk-delete")
async def bulk_remove_jobs(payload: Dict[str, Any]):
    """
    Deletes multiple project jobs/bundles from local storage.
    """
    job_ids = payload.get("job_ids", [])
    deleted_count = 0
    for jid in job_ids:
        if delete_job(jid):
            deleted_count += 1
    return {"status": "ok", "deleted_count": deleted_count, "job_ids": job_ids}

@app.delete("/api/clips/{clip_id}")
async def remove_clip(clip_id: str):
    """
    Deletes an individual clip from local storage.
    """
    success = delete_clip(clip_id)
    return {"status": "ok", "deleted_clip_id": clip_id, "deleted": success}

@app.post("/api/clips/bulk-delete")
async def bulk_remove_clips(payload: Dict[str, Any]):
    """
    Deletes multiple clips from local storage in a single bulk operation.
    """
    clip_ids = payload.get("clip_ids", [])
    deleted_count = 0
    for cid in clip_ids:
        if delete_clip(cid):
            deleted_count += 1
    return {"status": "ok", "deleted_count": deleted_count, "clip_ids": clip_ids}

@app.post("/api/jobs/{job_id}/submit-clips", response_model=JobResponse)
async def submit_clips_for_job(job_id: str, payload: SubmitClipsRequest, background_tasks: BackgroundTasks):
    """
    Submits user-approved AI clips (or chooses heuristic fallback) to resume rendering.
    """
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if payload.use_heuristic:
        background_tasks.add_task(resume_job_with_heuristic, job_id)
        job.stage_message = "Resuming with automated viral heuristics..."
        job.status = JobStatus.RENDERING
        return job

    try:
        if payload.raw_json:
            candidates = parse_llm_clips_json(payload.raw_json, job.duration)
        elif payload.clips:
            import json
            candidates = parse_llm_clips_json(json.dumps(payload.clips), job.duration)
        else:
            raise HTTPException(status_code=400, detail="Must provide either raw_json or clips list")

        background_tasks.add_task(resume_job_with_custom_clips, job_id, candidates)
        job.clips = candidates
        job.stage_message = f"Loaded {len(candidates)} AI clips. Starting render..."
        job.status = JobStatus.RENDERING
        return job
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/jobs/{job_id}/cancel")
async def cancel_job_endpoint(job_id: str):
    """
    Cancels an active or stuck job, clears internal state, and marks it failed/cancelled.
    """
    job = get_job(job_id)
    if job:
        # Never cancel or mark failed a job that has already completed or finished rendering clips
        if job.status == JobStatus.COMPLETED or (job.clips and len(job.clips) > 0 and all((CLIPS_DIR / f"{c.id}.mp4").exists() for c in job.clips)):
            return {"status": "ok", "job_id": job_id, "message": "Job is already completed."}
        job.status = JobStatus.FAILED
        job.stage_message = "Job cancelled by user."
        job.error = "Job cancelled."
        save_jobs_to_disk()
    jobs_internal_data.pop(job_id, None)
    return {"status": "ok", "job_id": job_id}

@app.post("/api/app/shutdown")
async def shutdown_app():
    """
    Cleanly shuts down the backend server process and frees port 8001.
    """
    import threading, time, os
    def _kill():
        time.sleep(0.5)
        os._exit(0)
    threading.Thread(target=_kill, daemon=True).start()
    return {"status": "shutting_down"}

@app.post("/api/parse-clips-json")
async def parse_clips_json_preview(payload: dict):
    """
    Validates and previews LLM output JSON without starting a job.
    """
    raw_text = payload.get("raw_json", "")
    if not raw_text:
        raise HTTPException(status_code=400, detail="raw_json is required")
    try:
        clips = parse_llm_clips_json(raw_text)
        return {"status": "ok", "clips": [c.model_dump() for c in clips]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/generate-prompt-from-srt")
async def generate_prompt_from_srt(payload: GeneratePromptRequest):
    """
    Instant AI Prompt generator for users who have an uploaded .SRT file.
    """
    if not payload.subtitle_upload_id:
        raise HTTPException(status_code=400, detail="subtitle_upload_id is required")

    sub_matches = list(DOWNLOADS_DIR.glob(f"{payload.subtitle_upload_id}.*"))
    if not sub_matches:
        raise HTTPException(status_code=404, detail="Uploaded subtitle file not found")

    sub_file = sub_matches[0]
    parsed_srt = parse_srt_file(sub_file)

    prompt_data = generate_ai_prompt(
        transcription_data=parsed_srt,
        num_clips=payload.num_clips,
        min_duration=payload.min_duration,
        max_duration=payload.max_duration,
        video_title=payload.video_title or ""
    )

    return {
        "status": "ok",
        "prompt": prompt_data["prompt"],
        "transcript_summary": prompt_data["transcript_summary"],
        "duration": parsed_srt.get("duration", 0.0)
    }

from fastapi.responses import FileResponse, PlainTextResponse, StreamingResponse, Response
import io
import re
import zipfile
from typing import Optional

@app.get("/api/download-clip/{clip_filename}")
async def download_clip_file(clip_filename: str, title: Optional[str] = None):
    """
    Forces an immediate browser file download by serving the clip with
    'Content-Disposition: attachment; filename="..."'
    """
    clean_filename = Path(clip_filename).name
    clip_path = CLIPS_DIR / clean_filename
    if not clip_path.exists():
        raise HTTPException(status_code=404, detail="Clip not found")

    download_name = title.strip() if title else clean_filename
    if not download_name.lower().endswith(".mp4"):
        download_name += ".mp4"

    safe_name = re.sub(r'[^a-zA-Z0-9_\-\.\s]', '', download_name).strip() or clean_filename
    safe_name = safe_name.replace(' ', '_')

    return FileResponse(
        path=str(clip_path),
        media_type="video/mp4",
        filename=safe_name,
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

@app.get("/api/jobs/{job_id}/download-zip")
async def download_job_bundle_zip(job_id: str):
    """
    Downloads all rendered clips in a job/bundle as a single zipped archive.
    Fixes zip truncation by reading entire buffer value and sets Content-Length.
    """
    from app.jobs import load_jobs_from_disk
    load_jobs_from_disk()

    clean_id = job_id
    if clean_id.startswith("bundle_"):
        clean_id = clean_id.replace("bundle_", "", 1)

    job = get_job(clean_id) or get_job(job_id)
    valid_clips = []
    bundle_title = "shorts_bundle"

    if job and job.clips:
        bundle_title = getattr(job, "video_title", None) or getattr(job, "title", None) or clean_id
        for clip in job.clips:
            if clip.rendered_url:
                clean_name = Path(clip.rendered_url.split("?")[0]).name
                clip_path = CLIPS_DIR / clean_name
                if clip_path.exists():
                    clip_title = clip.suggested_headline or clip.title or clean_name
                    valid_clips.append((clip_title, clip_path))
    else:
        # Fallback: search jobs_db for matching job
        for j in jobs_db.values():
            if j.job_id == clean_id or clean_id in j.job_id:
                bundle_title = getattr(j, "video_title", None) or j.job_id
                for clip in j.clips:
                    if clip.rendered_url:
                        clean_name = Path(clip.rendered_url.split("?")[0]).name
                        clip_path = CLIPS_DIR / clean_name
                        if clip_path.exists():
                            clip_title = clip.suggested_headline or clip.title or clean_name
                            valid_clips.append((clip_title, clip_path))
                if valid_clips:
                    break

    # If still not found, search CLIPS_DIR directly for any files containing clean_id
    if not valid_clips:
        matched_files = sorted(CLIPS_DIR.glob(f"*{clean_id}*.mp4"))
        if not matched_files:
            matched_files = sorted(CLIPS_DIR.glob("*.mp4"))
        for p in matched_files:
            valid_clips.append((p.stem, p))

    if not valid_clips:
        raise HTTPException(status_code=404, detail="No rendered clips available to download in this bundle")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for idx, (title, path) in enumerate(valid_clips, 1):
            safe_title = re.sub(r'[^a-zA-Z0-9_\-\s]', '', title).strip().replace(' ', '_')
            arcname = f"{idx:02d}_{safe_title}.mp4"
            zf.write(path, arcname=arcname)

    zip_bytes = zip_buffer.getvalue()
    raw_title = bundle_title or "shorts_bundle"
    bundle_name = re.sub(r'[^a-zA-Z0-9_\-\s]', '', raw_title).strip().replace(' ', '_') or "shorts_bundle"
    zip_filename = f"{bundle_name}.zip"

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{zip_filename}"',
            "Content-Length": str(len(zip_bytes)),
            "Access-Control-Expose-Headers": "Content-Disposition, Content-Length"
        }
    )

@app.get("/api/download-clips-zip")
@app.post("/api/download-clips-zip")
async def download_selected_clips_zip(
    clip_ids: Optional[str] = None,
    title: Optional[str] = "shorts_bundle",
    payload: Optional[Dict[str, Any]] = None
):
    """
    Downloads any array of clip IDs as a valid, non-corrupted ZIP archive.
    Accepts GET query param ?clip_ids=id1,id2 or POST JSON body {"clip_ids": [...]}.
    """
    ids_list = []
    bundle_title = title or "shorts_bundle"
    if payload:
        ids_list = payload.get("clip_ids", [])
        bundle_title = payload.get("title", bundle_title)
    if not ids_list and clip_ids:
        ids_list = [c.strip() for c in clip_ids.split(",") if c.strip()]

    valid_clips = []
    for cid in ids_list:
        clean_cid = Path(cid).stem
        target_file = CLIPS_DIR / f"{clean_cid}.mp4"
        if not target_file.exists():
            clean_name = Path(cid).name
            if (CLIPS_DIR / clean_name).exists():
                target_file = CLIPS_DIR / clean_name
        if target_file.exists():
            valid_clips.append((clean_cid, target_file))

    if not valid_clips:
        raise HTTPException(status_code=400, detail="No valid clips found on disk to zip")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for idx, (t, p) in enumerate(valid_clips, 1):
            safe_title = re.sub(r'[^a-zA-Z0-9_\-\s]', '', t).strip().replace(' ', '_')
            zf.write(p, arcname=f"{idx:02d}_{safe_title}.mp4")

    zip_bytes = zip_buffer.getvalue()
    safe_name = re.sub(r'[^a-zA-Z0-9_\-\s]', '', bundle_title).strip().replace(' ', '_') or "shorts_bundle"
    zip_filename = f"{safe_name}.zip"

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{zip_filename}"',
            "Content-Length": str(len(zip_bytes)),
            "Access-Control-Expose-Headers": "Content-Disposition, Content-Length"
        }
    )

@app.post("/api/open-clips-folder")
async def open_clips_folder(filename: Optional[str] = None):
    """
    Opens the local clips directory in Windows Explorer (or OS file manager),
    or selects the specific clip if filename is provided.
    """
    import subprocess
    import platform

    target_path = CLIPS_DIR
    if filename:
        clean_name = Path(filename).name
        candidate = CLIPS_DIR / clean_name
        if candidate.exists():
            target_path = candidate

    try:
        if platform.system() == "Windows":
            if target_path.is_file():
                subprocess.Popen(["explorer.exe", f"/select,{str(target_path)}"])
            else:
                os.startfile(str(target_path))
        elif platform.system() == "Darwin":
            if target_path.is_file():
                subprocess.Popen(["open", "-R", str(target_path)])
            else:
                subprocess.Popen(["open", str(target_path)])
        else:
            folder = target_path if target_path.is_dir() else target_path.parent
            subprocess.Popen(["xdg-open", str(folder)])
        return {"status": "ok", "path": str(target_path)}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/download-kaggle-notebook")
async def download_kaggle_notebook():
    nb_path = BASE_DIR / "tools" / "kaggle" / "kaggle_whisper_server.ipynb"
    if not nb_path.exists():
        raise HTTPException(status_code=404, detail="Kaggle notebook file not found")
    return FileResponse(
        str(nb_path),
        filename="viralclip_kaggle_whisper.ipynb",
        media_type="application/x-ipynb+json"
    )

@app.get("/api/kaggle-code")
async def get_kaggle_code():
    code_path = BASE_DIR / "tools" / "kaggle" / "kaggle_whisper_server.py"
    if not code_path.exists():
        raise HTTPException(status_code=404, detail="Kaggle code not found")
    return PlainTextResponse(code_path.read_text(encoding="utf-8"))

# Static file serving for rendered clips and audio (registered before SPA catchall)
app.mount("/api/clips", StaticFiles(directory=str(CLIPS_DIR)), name="clips")
app.mount("/api/audio", StaticFiles(directory=str(DOWNLOADS_DIR)), name="audio")

# Mount production Frontend SPA if built (frontend/dist or web/)
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
if not FRONTEND_DIST.exists():
    FRONTEND_DIST = BASE_DIR / "web"
if not FRONTEND_DIST.exists():
    FRONTEND_DIST = BASE_DIR.parent / "web"
if not FRONTEND_DIST.exists():
    FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Do not intercept API requests
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="Not Found")
        # Prevent Path Traversal
        try:
            target_file = (FRONTEND_DIST / full_path).resolve()
            if not str(target_file).startswith(str(FRONTEND_DIST.resolve())):
                raise HTTPException(status_code=403, detail="Access denied")
            if target_file.exists() and target_file.is_file():
                return FileResponse(target_file)
        except HTTPException:
            raise
        except Exception:
            pass
        index_file = FRONTEND_DIST / "index.html"
        if index_file.exists():
            return FileResponse(
                index_file,
                headers={
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0"
                }
            )
        raise HTTPException(status_code=404, detail="Page not found")



