"""FastAPI router for Stream Sniper (GTA 6 / Gaming Live & Chunked VOD Clipper)."""
import json
import logging
import re
import shutil
import subprocess
import time
import urllib.request
from pathlib import Path
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from . import brain, config, session, media, facecam

logger = logging.getLogger(__name__)

router = APIRouter()


class StartLiveRequest(BaseModel):
    url: str
    style: Optional[str] = "bounce"
    layout: Optional[str] = "gameplay"
    enable_facecam: Optional[bool] = True


class ClipNowRequest(BaseModel):
    seconds: Optional[int] = 45


class KeysRequest(BaseModel):
    groq_key: Optional[str] = None
    gemini_key: Optional[str] = None
    openai_key: Optional[str] = None
    openrouter_key: Optional[str] = None


class TestKeyRequest(BaseModel):
    provider: str
    key: str


class PreviewFrameRequest(BaseModel):
    url: str
    timestamp_sec: Optional[float] = 600.0


class CancelChunkRequest(BaseModel):
    chunk_idx: int


class ReframeSettingsRequest(BaseModel):
    layout: Optional[str] = "splitscreen"
    facecam_box: Optional[List[float]] = None
    gameplay_box: Optional[List[float]] = None
    hook_y: Optional[float] = None
    cap_y: Optional[float] = None
    split_pct: Optional[int] = 35


class InitVODRequest(BaseModel):
    url: str
    chunk_minutes: Optional[int] = 30
    style: Optional[str] = "bounce"
    layout: Optional[str] = "splitscreen"
    enable_facecam: Optional[bool] = False
    facecam_box: Optional[List[float]] = None
    gameplay_box: Optional[List[float]] = None
    hook_y: Optional[float] = None
    cap_y: Optional[float] = None
    split_pct: Optional[int] = 35


class ProcessChunkRequest(BaseModel):
    chunk_idx: int
    transcriber: Optional[str] = "parakeet"  # "parakeet" | "kaggle"
    kaggle_url: Optional[str] = None
    ai_mode: Optional[Any] = "auto"          # "auto" | "prompt" | False | True
    style: Optional[str] = None
    layout: Optional[str] = None
    facecam_box: Optional[List[float]] = None
    gameplay_box: Optional[List[float]] = None
    hook_y: Optional[float] = None
    cap_y: Optional[float] = None
    split_pct: Optional[int] = None


class SubmitJSONRequest(BaseModel):
    chunk_idx: int
    json_data: str
    style: Optional[str] = None
    layout: Optional[str] = None


class MergeChunksRequest(BaseModel):
    indices: List[int]


class SubmitMergedJSONRequest(BaseModel):
    json_data: str
    style: Optional[str] = None
    layout: Optional[str] = None


class ResumeVODRequest(BaseModel):
    session_id: str


@router.get("/keys")
def get_keys():
    return {
        "groq": bool(config.GROQ_KEY),
        "gemini": bool(config.GEMINI_KEY),
        "openai": bool(config.OPENAI_KEY),
        "openrouter": bool(config.OPENROUTER_KEY),
        "groq_preview": (config.GROQ_KEY[:6] + "..." + config.GROQ_KEY[-4:]) if len(config.GROQ_KEY) > 10 else ("*" * len(config.GROQ_KEY)),
        "gemini_preview": (config.GEMINI_KEY[:6] + "..." + config.GEMINI_KEY[-4:]) if len(config.GEMINI_KEY) > 10 else ("*" * len(config.GEMINI_KEY)),
        "openai_preview": (config.OPENAI_KEY[:6] + "..." + config.OPENAI_KEY[-4:]) if len(config.OPENAI_KEY) > 10 else ("*" * len(config.OPENAI_KEY)),
        "openrouter_preview": (config.OPENROUTER_KEY[:6] + "..." + config.OPENROUTER_KEY[-4:]) if len(config.OPENROUTER_KEY) > 10 else ("*" * len(config.OPENROUTER_KEY)),
    }


@router.post("/keys")
def update_keys(req: KeysRequest):
    if req.groq_key is not None:
        config.GROQ_KEY = req.groq_key.strip()
    if req.gemini_key is not None:
        config.GEMINI_KEY = req.gemini_key.strip()
    if req.openai_key is not None:
        config.OPENAI_KEY = req.openai_key.strip()
    if req.openrouter_key is not None:
        config.OPENROUTER_KEY = req.openrouter_key.strip()
    config.save_keys()
    return {"status": "ok", "message": "API keys saved successfully"}


@router.post("/keys/test")
def test_key(req: TestKeyRequest):
    """Tests if an API key is valid by making a fast lightweight call."""
    from . import brain
    ok, message = brain.test_api_key(req.provider, req.key)
    return {
        "ok": ok,
        "provider": req.provider,
        "message": message
    }


# ---------------------------------------------------------
# Live Pulse Sniper
# ---------------------------------------------------------

@router.post("/live/start")
def start_live(req: StartLiveRequest):
    if not req.url or not req.url.strip():
        raise HTTPException(status_code=400, detail="Stream URL is required")

    if session.LIVE_SESSION and not session.LIVE_SESSION.ended:
        session.LIVE_SESSION.stop()

    s = session.LiveSniperSession(
        url=req.url.strip(),
        style=req.style or "bounce",
        layout=req.layout or "gameplay",
        enable_facecam=req.enable_facecam if req.enable_facecam is not None else True
    )
    s.start()
    session.LIVE_SESSION = s
    return {"status": "started", "session_id": s.id}


@router.post("/live/stop")
def stop_live():
    if session.LIVE_SESSION:
        session.LIVE_SESSION.stop()
        return {"status": "stopped"}
    return {"status": "idle"}


@router.get("/live/status")
def get_live_status():
    s = session.LIVE_SESSION
    if not s:
        return {
            "active": False,
            "status": "idle",
            "db": [],
            "current_db": -100.0,
            "chat_velocity": 0,
            "title": "",
            "uploader": "",
            "game": ""
        }

    with s.lock:
        db_history = list(s.db[-35:])
        current_db = s.db[-1] if s.db else -100.0

    return {
        "active": not s.ended,
        "status": s.status,
        "error": s.error,
        "title": s.title,
        "uploader": s.uploader,
        "game": s.game,
        "db": db_history,
        "current_db": current_db,
        "chat_velocity": s.chat_velocity,
        "samples_sec": round(s.samples / session.SR, 1),
        "facecam_detected": bool(s.facecam_box)
    }


@router.post("/live/clip-now")
def clip_now(req: ClipNowRequest):
    s = session.LIVE_SESSION
    if not s or s.ended:
        raise HTTPException(status_code=400, detail="No active live stream recording.")

    sec = req.seconds or 45
    try:
        clip_info = s.clip_last(sec)
        return {"status": "queued", "clip": clip_info}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------
# Chunked Deep VOD Scanner
# ---------------------------------------------------------
# Stream Reframe & Layout Preview Endpoints
# ---------------------------------------------------------

@router.post("/vod/preview-frame")
def get_preview_frame(req: PreviewFrameRequest):
    """Fetches real gameplay/facecam snapshot directly from the video stream for split screen reframing.
    Extracts the actual real stream frame at the exact requested timestamp (e.g. 35m / 2100s).
    """
    url = req.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="Stream URL is required")

    out_dir = config.STORAGE_DIR / "stream_sniper" / "previews"
    out_dir.mkdir(parents=True, exist_ok=True)

    m = re.search(r"(?:v=|\/live\/|youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})", url)
    vid = m.group(1) if m else "preview"
    ts = max(5.0, float(req.timestamp_sec or 2100.0))
    ts_tag = int(ts)
    frame_file = out_dir / f"{vid}_frame_{ts_tag}.jpg"

    # 1. If real stream frame already exists locally and is valid, return immediately
    # (Thumbnail files are typically >150KB while 360p/480p stream frames are 20-90KB)
    if frame_file.exists() and frame_file.stat().st_size > 2000 and frame_file.stat().st_size != 323398:
        meta = {}
        try:
            meta = media.probe(frame_file)
        except Exception:
            pass
        detected_fc = None
        try:
            fc_res = facecam.detect_facecam(frame_file, streamer_hint=vid)
            if fc_res and (fc_res.get("found") or fc_res.get("box")):
                detected_fc = fc_res["box"]
        except Exception:
            pass
        return {
            "ok": True,
            "frame_url": f"/api/sniper/vod/preview-image/{frame_file.name}?t={int(time.time() * 1000)}",
            "width": meta.get("width", 1280),
            "height": meta.get("height", 720),
            "timestamp_sec": ts,
            "detected_facecam": detected_fc
        }

    # Clean old frame to guarantee fresh real stream capture
    frame_file.unlink(missing_ok=True)

    # 2. Check if a downloaded chunk video already exists locally in storage
    local_candidates = list((config.STORAGE_DIR / "stream_sniper" / "chunks").glob(f"*{vid}*.mp4")) + \
                       list((config.STORAGE_DIR / "stream_sniper" / "buffer").glob(f"*{vid}*.mp4"))
    for lcand in local_candidates:
        if lcand.exists() and lcand.stat().st_size > 500000:
            try:
                cmd = [config.FFMPEG_PATH, "-y", "-ss", "00:00:15", "-i", str(lcand), "-frames:v", "1", "-q:v", "2", str(frame_file)]
                subprocess.run(cmd, capture_output=True, timeout=5, creationflags=config.NO_WINDOW)
                if frame_file.exists() and frame_file.stat().st_size > 2000:
                    break
            except Exception:
                pass

    # 3. Extract the REAL stream frame at exact target timestamp (ts) using unthrottled direct format seek
    if not frame_file.exists() or frame_file.stat().st_size < 2000:
        stream_url = None
        try:
            fmt_choice = "18/134/229/worst[ext=mp4]/bestvideo[height<=480]/best[height<=480]"
            with media._ydl({"format": fmt_choice, "extract_flat": False}) as ydl:
                info = ydl.extract_info(url, download=False)
                stream_url = info.get("url")
                if not stream_url and info.get("requested_formats"):
                    stream_url = info["requested_formats"][0].get("url")

            if stream_url:
                ff_cmd = [
                    config.FFMPEG_PATH, "-y",
                    "-reconnect", "1",
                    "-reconnect_streamed", "1",
                    "-reconnect_delay_max", "5",
                    "-ss", str(ts),
                    "-i", stream_url,
                    "-frames:v", "1",
                    "-q:v", "2",
                    str(frame_file)
                ]
                subprocess.run(ff_cmd, capture_output=True, timeout=30, creationflags=config.NO_WINDOW)
        except Exception as e:
            logger.warning(f"Real stream frame seek failed at {ts}s: {e}")

        # If seeking at ts timed out or failed (e.g. stream shorter than ts), fallback to 60s of the real stream
        if (not frame_file.exists() or frame_file.stat().st_size < 2000) and stream_url:
            try:
                ff_fallback = [
                    config.FFMPEG_PATH, "-y",
                    "-reconnect", "1",
                    "-reconnect_streamed", "1",
                    "-reconnect_delay_max", "5",
                    "-ss", "60.0",
                    "-i", stream_url,
                    "-frames:v", "1",
                    "-q:v", "2",
                    str(frame_file)
                ]
                subprocess.run(ff_fallback, capture_output=True, timeout=20, creationflags=config.NO_WINDOW)
            except Exception as fe:
                logger.warning(f"Real stream frame fallback seek failed: {fe}")

    # 4. Ultimate fallback (offline only) - generate clean 16:9 stream canvas with facecam zone guide
    if not frame_file.exists() or frame_file.stat().st_size < 1000:
        try:
            from PIL import Image, ImageDraw
            img = Image.new("RGB", (1280, 720), color=(15, 17, 21))
            draw = ImageDraw.Draw(img)
            draw.rectangle([0, 0, 1280, 720], outline=(40, 45, 55), width=4)
            draw.rectangle([980, 30, 1250, 230], fill=(25, 30, 38), outline=(0, 240, 255), width=2)
            draw.text((1000, 50), "STREAMER WEBCAM", fill=(0, 240, 255))
            draw.text((450, 350), f"Real Stream: {vid} ({int(ts//60)}m)", fill=(180, 180, 180))
            img.save(frame_file, "JPEG", quality=85)
        except Exception as e:
            logger.error(f"Failed to generate canvas fallback frame: {e}")

    # Process and return response with AI Facecam YuNet coordinates
    if frame_file.exists() and frame_file.stat().st_size > 500:
        meta = {}
        try:
            meta = media.probe(frame_file)
        except Exception:
            pass
        detected_fc = None
        try:
            fc_res = facecam.detect_facecam(frame_file, streamer_hint=vid)
            if fc_res and (fc_res.get("found") or fc_res.get("box")):
                detected_fc = fc_res["box"]
        except Exception as fe:
            logger.warning(f"Facecam YuNet auto-detect failed: {fe}")

        return {
            "ok": True,
            "frame_url": f"/api/sniper/vod/preview-image/{frame_file.name}?t={int(time.time() * 1000)}",
            "width": meta.get("width", 1280),
            "height": meta.get("height", 720),
            "timestamp_sec": ts,
            "detected_facecam": detected_fc
        }

    return {"ok": False, "detail": "Could not extract stream frame from video."}


@router.post("/vod/cancel-chunk")
def cancel_vod_chunk(req: CancelChunkRequest):
    """Cancels a currently processing or transcribing chunk and resets its status."""
    v = session.VOD_SESSION
    if not v:
        saved = session.list_saved_vod_sessions()
        if saved:
            v = session.restore_vod_session_from_disk(saved[0]["id"])
    if not v:
        raise HTTPException(status_code=400, detail="No active stream session")
    v.cancel_chunk(req.chunk_idx)
    return {"ok": True, "chunk_idx": req.chunk_idx, "status": "cancelled"}


@router.get("/vod/preview-image/{filename}")
def serve_preview_image(filename: str):
    p = config.STORAGE_DIR / "stream_sniper" / "previews" / filename
    if not p.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    media_type = "image/jpeg"
    if p.suffix.lower() == ".png":
        media_type = "image/png"
    elif p.suffix.lower() == ".webp":
        media_type = "image/webp"
    return FileResponse(p, media_type=media_type)


class DetectFacecamRequest(BaseModel):
    image_name: Optional[str] = None
    stream_url: Optional[str] = None


@router.post("/vod/detect-facecam")
def api_detect_facecam(req: DetectFacecamRequest):
    """Detects streamer facecam in a preview frame using local YuNet AI."""
    preview_dir = config.STORAGE_DIR / "stream_sniper" / "previews"
    target_img = None
    if req.image_name:
        p = preview_dir / Path(req.image_name).name
        if p.exists():
            target_img = p
    if not target_img:
        imgs = sorted(list(preview_dir.glob("*.jpg")) + list(preview_dir.glob("*.png")), key=lambda f: f.stat().st_mtime, reverse=True)
        if imgs:
            target_img = imgs[0]

    if not target_img:
        raise HTTPException(status_code=404, detail="No preview image found to detect facecam.")

    res = facecam.detect_facecam(target_img, streamer_hint=req.stream_url)
    return res


@router.post("/vod/save-reframe")
def save_reframe(req: ReframeSettingsRequest):
    v = session.VOD_SESSION
    if not v:
        saved = session.list_saved_vod_sessions()
        if saved:
            v = session.restore_vod_session_from_disk(saved[0]["id"])
    if not v:
        raise HTTPException(status_code=400, detail="No active VOD session")

    if req.layout:
        v.layout = req.layout
    if req.facecam_box:
        v.facecam_box = req.facecam_box
    if req.gameplay_box:
        v.gameplay_box = req.gameplay_box
    if req.hook_y is not None:
        v.hook_y = req.hook_y
    if req.cap_y is not None:
        v.cap_y = req.cap_y
    if req.split_pct is not None:
        v.split_pct = req.split_pct

    v.reframe_locked = True
    session.save_vod_session_to_disk(v)
    return {
        "ok": True,
        "layout": v.layout,
        "facecam_box": v.facecam_box,
        "gameplay_box": v.gameplay_box,
        "hook_y": v.hook_y,
        "cap_y": v.cap_y,
        "split_pct": v.split_pct,
        "reframe_locked": True
    }


# ---------------------------------------------------------
# VOD Scanner Endpoints
# ---------------------------------------------------------

@router.post("/vod/init")
def init_vod(req: InitVODRequest):
    if not req.url or not req.url.strip():
        raise HTTPException(status_code=400, detail="Stream URL is required")

    session._SESSION_EXPLICITLY_RESET = False
    v = session.VODSniperSession(
        url=req.url.strip(),
        style=req.style or "bounce",
        layout=req.layout or "splitscreen",
        enable_facecam=req.enable_facecam if req.enable_facecam is not None else False,
        chunk_minutes=req.chunk_minutes or 30,
        facecam_box=req.facecam_box,
        gameplay_box=req.gameplay_box,
        hook_y=req.hook_y,
        cap_y=req.cap_y,
        split_pct=req.split_pct or 35
    )
    if req.facecam_box:
        v.reframe_locked = True
    try:
        v.init_stream()
        session.VOD_SESSION = v
        return {
            "status": "initialized",
            "session_id": v.id,
            "title": v.title,
            "uploader": v.uploader,
            "duration": v.duration,
            "game": v.game,
            "chunk_minutes": v.chunk_minutes,
            "chunks": v.chunks
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to analyze stream: {e}")


@router.post("/vod/process-chunk")
def process_chunk(req: ProcessChunkRequest, background_tasks: BackgroundTasks):
    v = session.VOD_SESSION
    if not v:
        raise HTTPException(status_code=400, detail="Initialize VOD session first.")

    if req.style:
        v.style = req.style
    if req.layout:
        v.layout = req.layout
    # Only update framing if reframe is NOT yet locked for this stream
    if not getattr(v, "reframe_locked", False):
        if req.facecam_box:
            v.facecam_box = req.facecam_box
        if req.gameplay_box:
            v.gameplay_box = req.gameplay_box
        if req.hook_y is not None:
            v.hook_y = req.hook_y
        if req.cap_y is not None:
            v.cap_y = req.cap_y
        if req.split_pct is not None:
            v.split_pct = req.split_pct

    result = v.enqueue_chunk(
        req.chunk_idx,
        req.transcriber or "parakeet",
        req.kaggle_url,
        req.ai_mode or "auto"
    )
    return result


@router.get("/vod/status")
def get_vod_status():
    v = session.VOD_SESSION
    if not v and not getattr(session, "_SESSION_EXPLICITLY_RESET", False):
        saved = session.list_saved_vod_sessions()
        if saved:
            v = session.restore_vod_session_from_disk(saved[0]["id"])
            session.VOD_SESSION = v
    if not v:
        return {
            "status": "idle",
            "url": "",
            "progress": 0,
            "stage": "",
            "title": "",
            "uploader": "",
            "game": "",
            "chunks": []
        }
    return {
        "status": v.status,
        "url": getattr(v, "url", ""),
        "stage": v.stage,
        "progress": v.progress,
        "title": v.title,
        "uploader": v.uploader,
        "game": v.game,
        "error": v.error,
        "active_chunk_idx": v.active_chunk_idx,
        "chunk_queue": [q["chunk_idx"] for q in getattr(v, "chunk_queue", [])],
        "chunks": v.chunks,
        "clips_count": len(v.clips),
        "merged_ready": bool(v.merged_transcript),
        "layout": getattr(v, "layout", "splitscreen"),
        "style": getattr(v, "style", "bounce"),
        "facecam_box": getattr(v, "facecam_box", None),
        "gameplay_box": getattr(v, "gameplay_box", None),
        "hook_y": getattr(v, "hook_y", 672),
        "cap_y": getattr(v, "cap_y", 1728),
        "split_pct": getattr(v, "split_pct", 35),
        "reframe_locked": getattr(v, "reframe_locked", False)
    }


@router.post("/vod/reset")
def reset_vod_session():
    """Wipes active in-memory VOD session so user can load a fresh stream."""
    session.VOD_SESSION = None
    session._SESSION_EXPLICITLY_RESET = True
    return {"ok": True, "status": "reset"}


@router.get("/vod/prompt/{chunk_idx}")
def get_chunk_prompt(chunk_idx: int):
    v = session.VOD_SESSION
    if not v or chunk_idx < 0 or chunk_idx >= len(v.chunks):
        raise HTTPException(status_code=404, detail="Chunk not found")

    chunk = v.chunks[chunk_idx]
    if not chunk.get("prompt"):
        raise HTTPException(status_code=400, detail="Chunk has not been transcribed yet.")

    return {
        "chunk_idx": chunk_idx,
        "label": chunk["label"],
        "prompt": chunk["prompt"]
    }


@router.post("/vod/submit-json")
def submit_chunk_json(req: SubmitJSONRequest, background_tasks: BackgroundTasks):
    v = session.VOD_SESSION
    if not v:
        raise HTTPException(status_code=400, detail="No active VOD session.")

    try:
        # Validate JSON upfront
        parsed = session.parse_clips_json(req.json_data)
        if not parsed:
            raise HTTPException(status_code=400, detail="No valid clip timestamps found in JSON.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON format: {e}")

    if 0 <= req.chunk_idx < len(v.chunks):
        v.chunks[req.chunk_idx]["status"] = "processing"
    v.status = "processing"
    v.stage = f"Rendering {len(parsed)} shorts for {v.chunks[req.chunk_idx]['label']}..."
    v.active_chunk_idx = req.chunk_idx
    session.save_vod_session_to_disk(v)

    background_tasks.add_task(v.submit_json_for_chunk, req.chunk_idx, req.json_data, req.style, req.layout)
    return {"status": "queued", "clips_count": len(parsed)}


@router.post("/vod/merge")
def merge_chunks(req: MergeChunksRequest):
    v = session.VOD_SESSION
    if not v:
        raise HTTPException(status_code=400, detail="No active VOD session.")

    try:
        merged_prompt = v.merge_chunks(req.indices)
        return {
            "status": "merged",
            "label": v.merged_transcript.get("label"),
            "prompt": merged_prompt
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/vod/submit-merged-json")
def submit_merged_json(req: SubmitMergedJSONRequest, background_tasks: BackgroundTasks):
    v = session.VOD_SESSION
    if not v or not v.merged_transcript:
        raise HTTPException(status_code=400, detail="No merged transcript found.")

    try:
        parsed = session.parse_clips_json(req.json_data)
        if not parsed:
            raise HTTPException(status_code=400, detail="No valid clips found in JSON.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {e}")

    # Use first index of merged transcript
    first_idx = v.merged_transcript["indices"][0]
    background_tasks.add_task(v.submit_json_for_chunk, first_idx, req.json_data, req.style, req.layout)
    return {"status": "queued", "clips_count": len(parsed)}


@router.get("/vod/history")
def get_vod_history():
    """Returns saved VOD scanner sessions from disk."""
    return {"sessions": session.list_saved_vod_sessions()}


@router.post("/vod/history/resume")
def resume_vod_session(req: ResumeVODRequest):
    """Restores a saved VOD session into active memory with zero re-downloading."""
    sess = session.restore_vod_session_from_disk(req.session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Saved VOD session not found.")
    return {
        "status": "ready",
        "session_id": sess.id,
        "url": sess.url,
        "title": sess.title,
        "uploader": sess.uploader,
        "duration": sess.duration,
        "game": sess.game,
        "chunk_minutes": sess.chunk_minutes,
        "chunks": sess.chunks,
        "stage": sess.stage,
        "progress": sess.progress,
        "error": sess.error,
        "active_chunk_idx": sess.active_chunk_idx,
        "clips_count": len(sess.clips),
        "merged_ready": bool(sess.merged_transcript)
    }


@router.delete("/vod/history/{session_id}")
def delete_vod_history(session_id: str):
    """Deletes a saved session from storage history."""
    session.delete_saved_vod_session(session_id)
    return {"status": "deleted", "session_id": session_id}


@router.get("/clips")
def get_clips():
    clips = session.get_clips_registry()
    return {"clips": clips}


@router.delete("/clips/{clip_id}")
def delete_clip(clip_id: str):
    """Deletes a single rendered short from the gallery and disk."""
    success = session.delete_clip_from_registry(clip_id)
    return {"status": "deleted", "clip_id": clip_id, "success": success}


@router.delete("/clips")
def clear_clips(filter: Optional[str] = "all"):
    """Clears clips from gallery (filter: 'vod', 'live', or 'all')."""
    count = session.clear_clips_registry(filter or "all")
    return {"status": "cleared", "deleted_count": count, "filter": filter}
