import asyncio
import json
import traceback
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, List

from app.config import DOWNLOADS_DIR, AUDIO_DIR, CLIPS_DIR, STORAGE_DIR
from app.models import CreateJobRequest, JobResponse, JobStatus, ClipCandidate, AspectRatio
from app.downloader import download_video, extract_audio
from app.transcriber import transcribe_audio
from app.srt_parser import parse_srt_file
from app.selector import (
    select_clips_heuristic,
    generate_ai_prompt,
    parse_llm_clips_json,
    format_seconds_to_time
)
from app.subtitles import generate_ass_subtitles
from app.composer import render_clip
from app.branding import generate_branding_overlay

# In-memory job registries
jobs_db: Dict[str, JobResponse] = {}
jobs_internal_data: Dict[str, Dict] = {}

JOBS_DB_FILE = STORAGE_DIR / "jobs_database.json"
JOBS_INTERNAL_DB_FILE = STORAGE_DIR / "jobs_internal_database.json"

def save_jobs_to_disk():
    try:
        data = {}
        for jid, job in jobs_db.items():
            data[jid] = job.model_dump()
        with open(JOBS_DB_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving jobs database: {e}")

    try:
        int_data = {}
        for jid, internal in jobs_internal_data.items():
            req = internal.get("request")
            int_data[jid] = {
                "video_path": str(internal.get("video_path")),
                "transcription_result": internal.get("transcription_result"),
                "request": req.model_dump() if hasattr(req, "model_dump") else req
            }
        with open(JOBS_INTERNAL_DB_FILE, "w", encoding="utf-8") as f:
            json.dump(int_data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving internal jobs database: {e}")

def load_jobs_from_disk():
    global jobs_db, jobs_internal_data
    if JOBS_DB_FILE.exists():
        try:
            with open(JOBS_DB_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            for jid, item in data.items():
                try:
                    jobs_db[jid] = JobResponse(**item)
                except Exception as ex:
                    print(f"Failed to parse saved job {jid}: {ex}")
        except Exception as e:
            print(f"Error loading jobs database: {e}")

    if JOBS_INTERNAL_DB_FILE.exists():
        try:
            with open(JOBS_INTERNAL_DB_FILE, "r", encoding="utf-8") as f:
                int_data = json.load(f)
            for jid, item in int_data.items():
                try:
                    req_data = item.get("request")
                    req_obj = CreateJobRequest(**req_data) if isinstance(req_data, dict) else req_data
                    jobs_internal_data[jid] = {
                        "video_path": item.get("video_path"),
                        "transcription_result": item.get("transcription_result"),
                        "request": req_obj
                    }
                except Exception as ex:
                    print(f"Failed to parse saved internal job {jid}: {ex}")
        except Exception as e:
            print(f"Error loading internal jobs database: {e}")

def extract_dialogue_from_ass(ass_path: Path) -> str:
    """Extracts clean spoken dialogue from an ASS subtitle file."""
    if not ass_path.exists():
        return ""
    try:
        content = ass_path.read_text(encoding="utf-8", errors="ignore")
        lines = [l for l in content.splitlines() if l.startswith("Dialogue:")]
        phrases = []
        last_phrase = ""
        import re
        for l in lines:
            parts = l.split(",", 9)
            if len(parts) < 10:
                continue
            text = parts[9].strip()
            clean = re.sub(r"\{[^}]+\}", "", text)
            clean = clean.replace(">>", "").replace("[laughter]", "").replace("[applause]", "").strip()
            clean = " ".join(clean.split())
            if clean and clean != last_phrase:
                last_phrase = clean
                phrases.append(clean)
        return " ".join(phrases)
    except Exception:
        return ""

def generate_clip_meta_from_dialogue(dialogue: str, cid: str, idx: int):
    import re
    clean = " ".join(dialogue.split()).strip()
    if not clean:
        title = f"Viral Moment #{idx + 1}"
        desc = "High engagement viral short cut for YouTube Shorts and Instagram Reels."
        tags = ["#shorts", "#viral", "#reels", "#trending"]
        return title, desc, tags

    sentences = [s.strip() for s in re.split(r"[.!?]+", clean) if len(s.strip()) > 3]
    if sentences:
        words = sentences[0].split()
        title_cand = " ".join(words[:6]) if len(words) > 7 else sentences[0]
    else:
        title_cand = " ".join(clean.split()[:6])

    title = title_cand.title().strip(" ,.:;-\"'")
    if not title:
        title = f"Viral Moment #{idx + 1}"

    if len(sentences) >= 2:
        desc = f"{sentences[0]}. {sentences[1]}."
    elif sentences:
        desc = f"{sentences[0]}. Watch till the end for the full breakdown!"
    else:
        desc = clean[:120] + "... Watch till the end!"

    desc = desc[0].upper() + desc[1:].lower() if len(desc) > 1 else desc

    lower = clean.lower()
    tags = ["#shorts", "#viral", "#trending"]
    if any(k in lower for k in ["health", "sleep", "cortisol", "body", "energy"]):
        tags.extend(["#health", "#wellness"])
    elif any(k in lower for k in ["money", "business", "dollar", "wealth"]):
        tags.extend(["#mindset", "#finance"])
    elif any(k in lower for k in ["tech", "ai", "code", "software"]):
        tags.extend(["#tech", "#future"])
    elif any(k in lower for k in ["fire", "rock", "nature", "wild"]):
        tags.extend(["#outdoors", "#survival"])
    else:
        tags.extend(["#reels", "#fyp"])

    return title, desc, tags[:5]

def discover_unindexed_clips():
    """Finds rendered mp4 clips in CLIPS_DIR that are not yet tracked in jobs_db, and groups them into saved library entries."""
    global jobs_db
    known_clip_ids = set()
    for job in jobs_db.values():
        if job.status == JobStatus.COMPLETED:
            for c in job.clips:
                known_clip_ids.add(c.id)

    mp4_files = sorted(CLIPS_DIR.glob("*.mp4"), key=lambda p: p.stat().st_mtime, reverse=True)
    unindexed = [p for p in mp4_files if p.stem not in known_clip_ids]

    if unindexed:
        archive_id = "job_saved_library"
        existing_archive = jobs_db.get(archive_id)
        archive_clips = list(existing_archive.clips) if existing_archive else []
        existing_ids = {c.id for c in archive_clips}

        for idx, mp4 in enumerate(unindexed):
            cid = mp4.stem
            if cid not in existing_ids:
                ass_file = CLIPS_DIR / f"{cid}_subtitles.ass"
                dialogue = extract_dialogue_from_ass(ass_file)
                title, desc, tags = generate_clip_meta_from_dialogue(dialogue, cid, len(archive_clips) + idx)
                archive_clips.append(
                    ClipCandidate(
                        id=cid,
                        title=title,
                        start_time=0.0,
                        end_time=30.0,
                        duration=30.0,
                        hook_score=88,
                        hook_reason="",
                        suggested_headline=title,
                        description=desc,
                        hashtags=tags,
                        rendered_url=f"/api/clips/{mp4.name}"
                    )
                )

        if archive_clips:
            jobs_db[archive_id] = JobResponse(
                job_id=archive_id,
                status=JobStatus.COMPLETED,
                progress=100,
                stage_message=f"Locally stored library ({len(archive_clips)} clips)",
                video_title="Local Video Archive",
                duration=None,
                clips=archive_clips,
                created_at=(existing_archive.created_at if existing_archive and existing_archive.created_at else datetime.now().strftime("%d %b %Y, %I:%M %p"))
            )
            save_jobs_to_disk()

# Initial load and clip discovery
load_jobs_from_disk()
discover_unindexed_clips()

def get_job(job_id: str) -> Optional[JobResponse]:
    return jobs_db.get(job_id)

def get_all_jobs() -> List[JobResponse]:
    load_jobs_from_disk()

    changed = False
    # Auto-heal any jobs that have rendered clips on disk but were marked failed or cancelled
    for jid, job in list(jobs_db.items()):
        if job.status == JobStatus.FAILED and job.clips:
            valid_clips = [c for c in job.clips if (CLIPS_DIR / f"{c.id}.mp4").exists()]
            if valid_clips:
                job.clips = valid_clips
                job.status = JobStatus.COMPLETED
                job.progress = 100
                job.error = None
                job.stage_message = f"Successfully generated {len(valid_clips)} viral clips!"
                changed = True

    # Scan and index any unindexed mp4 files in CLIPS_DIR
    discover_unindexed_clips()

    # Prune any clips whose files were removed from disk (only for COMPLETED or FAILED jobs, NEVER while active)
    for jid, job in list(jobs_db.items()):
        if job.status in [JobStatus.RENDERING, JobStatus.PENDING, JobStatus.AWAITING_CLIPS, JobStatus.DOWNLOADING, JobStatus.TRANSCRIBING, JobStatus.SELECTING, JobStatus.TRACKING]:
            continue
        original_count = len(job.clips)
        job.clips = [c for c in job.clips if (CLIPS_DIR / f"{c.id}.mp4").exists()]
        if len(job.clips) != original_count:
            changed = True
        if len(job.clips) == 0 and jid != "job_saved_library" and job.status in [JobStatus.COMPLETED, JobStatus.FAILED]:
            jobs_db.pop(jid, None)
            changed = True
    if changed:
        save_jobs_to_disk()

    return sorted(
        list(jobs_db.values()),
        key=lambda j: j.created_at or "",
        reverse=True
    )

def delete_job(job_id: str) -> bool:
    job = jobs_db.pop(job_id, None)
    jobs_internal_data.pop(job_id, None)
    if job:
        for clip in job.clips:
            mp4_file = CLIPS_DIR / f"{clip.id}.mp4"
            ass_file = CLIPS_DIR / f"{clip.id}_subtitles.ass"
            try:
                if mp4_file.exists():
                    mp4_file.unlink()
                if ass_file.exists():
                    ass_file.unlink()
            except Exception:
                pass
        save_jobs_to_disk()
        return True
    return False

def delete_clip(clip_id: str) -> bool:
    found = False
    for job_id, job in list(jobs_db.items()):
        initial_len = len(job.clips)
        job.clips = [c for c in job.clips if c.id != clip_id]
        if len(job.clips) < initial_len:
            found = True
        if len(job.clips) == 0 and job_id != "job_saved_library" and job.status in [JobStatus.COMPLETED, JobStatus.FAILED]:
            jobs_db.pop(job_id, None)

    mp4_file = CLIPS_DIR / f"{clip_id}.mp4"
    ass_file = CLIPS_DIR / f"{clip_id}_subtitles.ass"
    try:
        if mp4_file.exists():
            mp4_file.unlink()
            found = True
        if ass_file.exists():
            ass_file.unlink()
    except Exception as e:
        print(f"Error unlinking clip files for {clip_id}: {e}")

    if found:
        save_jobs_to_disk()
    return found

def get_storage_videos_history() -> List[Dict]:
    """
    Returns a list of all videos and transcripts stored in downloads / jobs_internal_data,
    enabling users to instantly re-use previously processed videos to create more shorts.
    """
    load_jobs_from_disk()
    history = []
    seen_paths = set()

    # 1. Check jobs_internal_data (tracks video_path and transcription_result)
    for jid, item in list(jobs_internal_data.items()):
        v_path_str = item.get("video_path")
        if not v_path_str:
            continue
        v_path = Path(v_path_str)
        if not v_path.exists():
            continue
        canon_path = str(v_path.resolve())
        if canon_path in seen_paths:
            continue
        seen_paths.add(canon_path)

        db_job = jobs_db.get(jid)
        tr = item.get("transcription_result") or {}
        duration = db_job.duration if (db_job and db_job.duration) else tr.get("duration", 0.0)
        dur_str = format_seconds_to_time(duration) if duration else "Available"
        file_size_mb = round(v_path.stat().st_size / (1024 * 1024), 1)
        mtime = v_path.stat().st_mtime
        date_str = datetime.fromtimestamp(mtime).strftime("%d %b %Y, %I:%M %p")

        title = (db_job.video_title if db_job and db_job.video_title else v_path.stem)
        clips_count = len(db_job.clips) if db_job and db_job.clips else 0
        seg_count = len(tr.get("segments", []))

        history.append({
            "id": jid,
            "reuse_job_id": jid,
            "reuse_video_id": v_path.stem,
            "title": title,
            "filename": v_path.name,
            "size_mb": file_size_mb,
            "duration": duration,
            "duration_formatted": dur_str,
            "created_at": (db_job.created_at if db_job and db_job.created_at else date_str),
            "timestamp": mtime,
            "has_transcription": bool(seg_count > 0 or tr.get("words")),
            "segments_count": seg_count,
            "clips_count": clips_count
        })

    # 2. Check any remaining video files in DOWNLOADS_DIR not yet tracked
    video_exts = {".mp4", ".mov", ".mkv", ".webm", ".avi"}
    for f in DOWNLOADS_DIR.iterdir():
        if f.is_file() and f.suffix.lower() in video_exts and not f.name.endswith(".part"):
            canon_path = str(f.resolve())
            if canon_path in seen_paths:
                continue
            seen_paths.add(canon_path)

            file_size_mb = round(f.stat().st_size / (1024 * 1024), 1)
            mtime = f.stat().st_mtime
            date_str = datetime.fromtimestamp(mtime).strftime("%d %b %Y, %I:%M %p")

            # Check if any .srt exists in DOWNLOADS_DIR
            matching_srt = DOWNLOADS_DIR / f"{f.stem}.srt"
            if not matching_srt.exists():
                all_srts = list(DOWNLOADS_DIR.glob("*.srt"))
                matching_srt = all_srts[0] if all_srts else None

            has_srt = matching_srt is not None and matching_srt.exists()
            seg_count = 0
            dur_val = 0.0
            dur_str = "Available in Storage"

            if has_srt:
                try:
                    parsed = parse_srt_file(matching_srt)
                    seg_count = len(parsed.get("segments", []))
                    dur_val = parsed.get("duration", 0.0)
                    if dur_val > 0:
                        dur_str = format_seconds_to_time(dur_val)
                except Exception:
                    pass

            history.append({
                "id": f.stem,
                "reuse_job_id": None,
                "reuse_video_id": f.stem,
                "title": f.stem,
                "filename": f.name,
                "size_mb": file_size_mb,
                "duration": dur_val,
                "duration_formatted": dur_str,
                "created_at": date_str,
                "timestamp": mtime,
                "has_transcription": has_srt,
                "segments_count": seg_count,
                "clips_count": 0
            })

    history.sort(key=lambda x: x["timestamp"], reverse=True)
    return history

def delete_storage_video(video_id: str) -> bool:
    """
    Deletes a video and its cache from downloads and internal jobs data.
    """
    deleted = False
    if video_id in jobs_internal_data:
        v_path_str = jobs_internal_data[video_id].get("video_path")
        if v_path_str:
            p = Path(v_path_str)
            if p.exists():
                try:
                    p.unlink()
                    deleted = True
                except Exception:
                    pass
        jobs_internal_data.pop(video_id, None)

    for f in list(DOWNLOADS_DIR.glob(f"{video_id}.*")):
        try:
            f.unlink()
            deleted = True
        except Exception:
            pass

    save_jobs_to_disk()
    return deleted

def create_job(request: CreateJobRequest) -> JobResponse:
    job_id = f"job_{uuid.uuid4().hex[:10]}"
    job_resp = JobResponse(
        job_id=job_id,
        status=JobStatus.PENDING,
        progress=0,
        stage_message="Job queued for processing",
        created_at=datetime.now().strftime("%d %b %Y, %I:%M %p")
    )
    jobs_db[job_id] = job_resp
    save_jobs_to_disk()
    return job_resp

async def render_job_clips(
    job_id: str,
    video_path: Path,
    transcription_result: Dict,
    candidates: List[ClipCandidate],
    request: CreateJobRequest
):
    job = jobs_db.get(job_id)
    if not job:
        return

    try:
        candidates_list = list(candidates)
        total_clips = len(candidates_list)
        job.clips = candidates_list
        job.status = JobStatus.RENDERING
        job.stage_message = f"Rendering {total_clips} vertical clips with animated subtitles..."
        job.progress = 75

        words = transcription_result.get("words", [])

        # Check for background music file if requested
        music_file = None
        if getattr(request, "music_upload_id", None):
            m_matches = list(DOWNLOADS_DIR.glob(f"{request.music_upload_id}.*"))
            if m_matches:
                music_file = m_matches[0]

        # Check for logo file if requested
        logo_file = None
        if getattr(request, "template_logo_upload_id", None):
            l_matches = list(DOWNLOADS_DIR.glob(f"{request.template_logo_upload_id}.*"))
            if l_matches:
                logo_file = l_matches[0]

        clean_job_prefix = str(job_id).replace("job_", "")
        for idx, clip in enumerate(candidates_list):
            # Ensure clip ID is uniquely scoped to this specific job so clips from different jobs never collide
            if not clip.id.startswith(f"{clean_job_prefix}_"):
                clip.id = f"{clean_job_prefix}_{clip.id}"

            sub_path = CLIPS_DIR / f"{clip.id}_subtitles.ass"
            output_mp4 = CLIPS_DIR / f"{clip.id}.mp4"

            # 1. Determine Target Dimensions & Canvas Spec
            is_social_card = bool(getattr(request, "template_social_card_enabled", False))
            is_bordered_card = bool(getattr(request, "template_card_padding", False))

            if is_social_card or is_bordered_card:
                target_w = 1080
                target_h = 1920
            elif request.aspect_ratio == "1:1":
                target_w = 1080
                target_h = 1080
            elif request.aspect_ratio == "16:9":
                target_w = 1920
                target_h = 1080
            else:
                target_w = 1080
                target_h = 1920

            # 2. Generate ASS Subtitles (Skip if subtitles disabled)
            subtitles_disabled = (
                str(getattr(request, "subtitle_style", "")).lower() in ("none", "off", "disabled")
                or getattr(request, "subtitle_style", None) == SubtitleStyle.NONE
            )

            if not subtitles_disabled:
                generate_ass_subtitles(
                    words=words,
                    clip_start=clip.start_time,
                    clip_end=clip.end_time,
                    output_ass_path=sub_path,
                    style=request.subtitle_style,
                    position=getattr(request, "caption_position", "bottom") or "bottom",
                    offset_x=getattr(request, "caption_offset_x", 0) or 0,
                    offset_y=getattr(request, "caption_offset_y", 0) or 0,
                    scale=getattr(request, "caption_scale", 1.0) or 1.0,
                    width=target_w,
                    height=target_h,
                    social_card_enabled=is_social_card
                )

            # 3. Generate Branding Overlay (Hook Text, Brand Logo, Watermark, Social Card)
            branding_overlay_path = None
            try:
                hook_mode = getattr(request, "template_hook_mode", "ai_hook") or "ai_hook"
                if hook_mode == "custom" and getattr(request, "template_hook_text", None):
                    hook_txt = str(getattr(request, "template_hook_text", "")).strip()
                else:
                    # Dynamic AI Generated Hook per clip from JSON (hook / suggested_headline / title)
                    hook_txt = str(
                        getattr(clip, "hook", "")
                        or getattr(clip, "suggested_headline", "")
                        or getattr(clip, "title", "")
                        or ""
                    ).strip()

                hook_enabled_flag = bool(
                    getattr(request, "template_hook_enabled", False)
                    or (is_social_card and bool(hook_txt))
                )

                overlay_file = CLIPS_DIR / f"{clip.id}_branding.png"
                branding_overlay_path = generate_branding_overlay(
                    output_png_path=overlay_file,
                    target_width=target_w,
                    target_height=target_h,
                    hook_enabled=hook_enabled_flag,
                    hook_text=hook_txt,
                    hook_color=getattr(request, "template_hook_color", "#000000") or "#000000",
                    hook_bg=getattr(request, "template_hook_bg", "transparent") or "transparent",
                    hook_bg_color=getattr(request, "template_hook_bg_color", "#facc15") or "#facc15",
                    hook_x=getattr(request, "template_hook_x", None),
                    hook_y=getattr(request, "template_hook_y", 48) or 48,
                    logo_path=logo_file,
                    logo_enabled=bool(getattr(request, "template_logo_enabled", False) or logo_file is not None),
                    logo_position=getattr(request, "template_logo_position", "top_left") or "top_left",
                    logo_x=getattr(request, "template_logo_x", None),
                    logo_y=getattr(request, "template_logo_y", None),
                    logo_size=getattr(request, "template_logo_size", 36) or 36,
                    logo_opacity=getattr(request, "template_logo_opacity", 1.0) or 1.0,
                    watermark_enabled=bool(getattr(request, "template_watermark_enabled", False)),
                    watermark_text=getattr(request, "template_watermark_text", None),
                    watermark_position=getattr(request, "template_watermark_position", "bottom_center") or "bottom_center",
                    watermark_x=getattr(request, "template_watermark_x", None),
                    watermark_y=getattr(request, "template_watermark_y", None),
                    watermark_color=getattr(request, "template_watermark_color", "#a1a1aa") or "#a1a1aa",
                    watermark_opacity=getattr(request, "template_watermark_opacity", 0.85) or 0.85,
                    social_card_enabled=is_social_card,
                    channel_name=getattr(request, "template_channel_name", "") or "",
                    channel_handle=getattr(request, "template_channel_handle", "") or "",
                    like_subscribe_enabled=bool(getattr(request, "template_like_subscribe_enabled", False)),
                    social_card_bg=getattr(request, "template_social_card_bg", "#0c0f14") or "#0c0f14",
                    social_footer_enabled=bool(getattr(request, "template_social_footer_enabled", False)),
                    corner_radius=getattr(request, "template_corner_radius", 14) or 14,
                    aspect_ratio="1:1" if is_social_card else str(request.aspect_ratio)
                )
            except Exception as e:
                print(f"Error generating branding overlay for clip {clip.id}: {e}")
                branding_overlay_path = None

            # 4. Render MP4
            def render_cb(pct, msg):
                step_pct = (idx / total_clips) + (pct / 100.0 / total_clips)
                job.progress = int(75 + step_pct * 23)
                job.stage_message = f"Rendering Clip #{idx+1}/{total_clips}: {msg}"

            render_aspect = AspectRatio.PORTRAIT_9_16 if (is_social_card or is_bordered_card) else request.aspect_ratio

            await asyncio.to_thread(
                render_clip,
                source_video_path=video_path,
                start_time=clip.start_time,
                end_time=clip.end_time,
                ass_subtitle_path=None if subtitles_disabled else sub_path,
                output_clip_path=output_mp4,
                aspect_ratio=render_aspect,
                fit_mode=request.fit_mode,
                progress_callback=render_cb,
                music_path=music_file,
                music_volume=getattr(request, "music_volume", 0.2) if getattr(request, "music_volume", None) is not None else 0.2,
                original_volume=getattr(request, "original_volume", 1.0) if getattr(request, "original_volume", None) is not None else 1.0,
                music_start_time=getattr(request, "music_start_time", 0.0) if getattr(request, "music_start_time", None) is not None else 0.0,
                template_bg_color=getattr(request, "template_bg_color", None),
                template_card_padding=is_bordered_card,
                social_card_enabled=is_social_card,
                has_hook=bool(hook_txt),
                has_footer=bool(getattr(request, "template_social_footer_enabled", False)),
                logo_path=logo_file,
                logo_position=getattr(request, "template_logo_position", "top_left") or "top_left",
                branding_overlay_path=branding_overlay_path
            )

            clip.rendered_url = f"/api/clips/{output_mp4.name}"
            # Ensure clip is in job.clips
            if clip not in job.clips:
                job.clips.append(clip)
            job.stage_message = f"Rendered short {idx+1}/{total_clips}: {clip.suggested_headline or clip.title or 'Viral Short'}"
            save_jobs_to_disk()

        # Complete!
        job.clips = candidates_list
        job.status = JobStatus.COMPLETED
        job.progress = 100
        job.stage_message = f"Successfully generated {len(job.clips)} viral clips!"
        save_jobs_to_disk()

    except Exception as e:
        import re
        raw_err = str(e)
        clean_err = re.sub(r'\x1b\[[0-9;]*[a-zA-Z]', '', raw_err)
        clean_err = clean_err.replace("ERROR: ", "").strip()
        job.status = JobStatus.FAILED
        job.error = clean_err
        job.stage_message = f"Failed: {clean_err}"
        save_jobs_to_disk()
        print(f"Error rendering clips for job {job_id}:")
        traceback.print_exc()

def _try_recover_internal_job(job_id: str) -> Optional[Dict]:
    job = jobs_db.get(job_id)
    if not job:
        return None
    video_path = None
    if job.video_title:
        candidate_paths = [
            DOWNLOADS_DIR / f"{job.video_title}.mp4",
            DOWNLOADS_DIR / f"{job.video_title}",
            DOWNLOADS_DIR / f"{job_id}.mp4"
        ]
        for cp in candidate_paths:
            if cp.exists():
                video_path = cp
                break
    if not video_path:
        for f in DOWNLOADS_DIR.glob("*.mp4"):
            if job_id in f.name or (job.video_title and job.video_title in f.name):
                video_path = f
                break

    if not video_path or not video_path.exists():
        return None

    recovered_request = CreateJobRequest(
        video_url=None,
        aspect_ratio="9:16",
        fit_mode="blur_padding",
        subtitle_style="hormozi",
        num_clips=3,
        min_clip_duration=25,
        max_clip_duration=60
    )
    transcription_result = {
        "status": "success",
        "duration": job.duration or 60.0,
        "segments": [],
        "words": []
    }
    internal = {
        "video_path": str(video_path),
        "transcription_result": transcription_result,
        "request": recovered_request
    }
    jobs_internal_data[job_id] = internal
    save_jobs_to_disk()
    return internal

async def resume_job_with_custom_clips(job_id: str, candidates: List[ClipCandidate]):
    job = jobs_db.get(job_id)
    internal = jobs_internal_data.get(job_id)
    if not job or not internal:
        recovered = _try_recover_internal_job(job_id)
        if recovered:
            internal = recovered
        else:
            if job:
                job.status = JobStatus.FAILED
                job.error = "Job session expired or video file was not found. Please click 'Start New Video'."
                save_jobs_to_disk()
            raise ValueError(f"Job state for {job_id} not found or expired")

    await render_job_clips(
        job_id=job_id,
        video_path=internal["video_path"],
        transcription_result=internal["transcription_result"],
        candidates=candidates,
        request=internal["request"]
    )

async def resume_job_with_heuristic(job_id: str):
    job = jobs_db.get(job_id)
    internal = jobs_internal_data.get(job_id)
    if not job or not internal:
        recovered = _try_recover_internal_job(job_id)
        if recovered:
            internal = recovered
        else:
            if job:
                job.status = JobStatus.FAILED
                job.error = "Job session expired or video file was not found. Please click 'Start New Video'."
                save_jobs_to_disk()
            raise ValueError(f"Job state for {job_id} not found or expired")

    request: CreateJobRequest = internal["request"]
    transcription_result = internal["transcription_result"]

    candidates = select_clips_heuristic(
        transcription_result,
        num_clips=request.num_clips,
        min_duration=float(request.min_clip_duration),
        max_duration=float(request.max_clip_duration)
    )

    await render_job_clips(
        job_id=job_id,
        video_path=internal["video_path"],
        transcription_result=transcription_result,
        candidates=candidates,
        request=request
    )

async def run_pipeline(job_id: str, request: CreateJobRequest):
    job = jobs_db.get(job_id)
    if not job:
        return

    try:
        # Phase 1: Ingestion
        job.status = JobStatus.DOWNLOADING
        job.stage_message = "Ingesting video source..."
        job.progress = 5
        transcription_result = None

        if request.reuse_job_id and request.reuse_job_id in jobs_internal_data:
            internal = jobs_internal_data[request.reuse_job_id]
            video_path = Path(internal["video_path"])
            if not video_path.exists():
                raise FileNotFoundError(f"Storage video file {video_path.name} was removed from disk")
            transcription_result = internal["transcription_result"]
            old_job = jobs_db.get(request.reuse_job_id)
            job.video_title = old_job.video_title if old_job and old_job.video_title else video_path.stem
            job.duration = (old_job.duration if old_job and old_job.duration else transcription_result.get("duration", 60.0))
            job.progress = 65
            job.stage_message = f"Re-using cached video & transcript: {job.video_title}"
        elif request.reuse_video_id:
            matches = list(DOWNLOADS_DIR.glob(f"{request.reuse_video_id}.*"))
            if not matches:
                for jid, item in jobs_internal_data.items():
                    vp = Path(item.get("video_path", ""))
                    if request.reuse_video_id in vp.stem or request.reuse_video_id in vp.name:
                        video_path = vp
                        transcription_result = item.get("transcription_result")
                        old_job = jobs_db.get(jid)
                        job.video_title = old_job.video_title if old_job and old_job.video_title else video_path.stem
                        job.duration = (old_job.duration if old_job and old_job.duration else transcription_result.get("duration", 60.0))
                        break
            else:
                video_path = matches[0]
                job.video_title = video_path.stem
                for jid, item in jobs_internal_data.items():
                    vp = Path(item.get("video_path", ""))
                    if vp.name == video_path.name:
                        transcription_result = item.get("transcription_result")
                        break
                if not transcription_result:
                    srt_matches = list(DOWNLOADS_DIR.glob(f"{video_path.stem}.srt"))
                    if not srt_matches:
                        srt_matches = list(DOWNLOADS_DIR.glob("*.srt"))
                    if srt_matches:
                        transcription_result = parse_srt_file(srt_matches[0])

            if not video_path or not video_path.exists():
                raise FileNotFoundError(f"Selected video {request.reuse_video_id} not found in storage")
            if not transcription_result:
                raise ValueError("Could not find transcript for this storage video. Please provide .SRT or Kaggle GPU URL.")
            job.progress = 65
            job.stage_message = f"Re-using storage video: {job.video_title}"
        elif request.video_url:
            def dl_cb(pct, msg):
                job.progress = int(5 + (pct / 100) * 20)
                job.stage_message = msg

            # Run download in threadpool with selected quality
            video_path, title, duration = await asyncio.to_thread(
                download_video, request.video_url, job_id, dl_cb, request.video_quality or "1080p"
            )
            job.video_title = title
            job.duration = duration
        elif request.upload_id:
            # Local uploaded video file
            matches = list(DOWNLOADS_DIR.glob(f"{request.upload_id}.*"))
            if not matches:
                raise FileNotFoundError(f"Uploaded video with id {request.upload_id} not found")
            video_path = matches[0]
            job.video_title = video_path.stem
            job.duration = 60.0 # Will be updated by transcriber
        else:
            raise ValueError("Must provide video_url, upload_id, or select a stored video from history")

        # Phase 2: Transcription or Subtitle Processing (skipped if already re-used from storage)
        if transcription_result is None:
            if request.subtitle_upload_id:
                sub_matches = list(DOWNLOADS_DIR.glob(f"{request.subtitle_upload_id}.*"))
                if not sub_matches:
                    raise FileNotFoundError(f"Uploaded subtitle file {request.subtitle_upload_id} not found")
                sub_file = sub_matches[0]
                job.status = JobStatus.TRANSCRIBING
                job.stage_message = f"Parsing custom SRT subtitles ({sub_file.name})... Bypassing Whisper!"
                job.progress = 60

                transcription_result = await asyncio.to_thread(parse_srt_file, sub_file)
                srt_range = transcription_result.get("srt_range", {})
                job.duration = srt_range.get("end", 60.0)
                job.stage_message = f"Synced with SRT ({srt_range.get('start', 0)}s - {srt_range.get('end', 0)}s). Extra video trimmed!"
            elif request.colab_transcribe_url:
                job.status = JobStatus.TRANSCRIBING
                job.stage_message = "Extracting audio for Remote Kaggle GPU..."
                job.progress = 30

                audio_path = AUDIO_DIR / f"{job_id}.mp3"
                await asyncio.to_thread(extract_audio, video_path, audio_path)

                job.stage_message = "Uploading audio to Remote Kaggle GPU..."
                job.progress = 45
                import requests
                import time
                from requests.adapters import HTTPAdapter
                from urllib3.util.retry import Retry

                endpoint = request.colab_transcribe_url.rstrip("/") + "/transcribe"
                status_base = request.colab_transcribe_url.rstrip("/") + "/status"

                def _execute_remote_transcription():
                    import socket
                    socket.setdefaulttimeout(300)

                    session = requests.Session()
                    retries = Retry(total=3, backoff_factor=1.5, status_forcelist=[500, 502, 503, 504])
                    session.mount("https://", HTTPAdapter(max_retries=retries))
                    session.mount("http://", HTTPAdapter(max_retries=retries))

                    # Step 1: Submit audio file with in-memory bytes
                    with open(audio_path, "rb") as f:
                        audio_bytes = f.read()

                    headers = {
                        "User-Agent": "ViralClipAI/1.0",
                    }

                    upload_attempts = 0
                    r = None
                    while upload_attempts < 3:
                        try:
                            upload_attempts += 1
                            r = session.post(
                                endpoint,
                                files={"file": (f"{job_id}.mp3", audio_bytes, "audio/mpeg")},
                                headers=headers,
                                timeout=300
                            )
                            if r.status_code == 200:
                                break
                        except Exception as up_err:
                            print(f"Upload attempt {upload_attempts} failed: {up_err}")
                            if upload_attempts >= 3:
                                raise RuntimeError(f"Failed to upload audio to Kaggle GPU after 3 attempts: {up_err}")
                            time.sleep(3)

                    if not r or r.status_code != 200:
                        err_msg = r.text if r else "No response"
                        raise RuntimeError(f"Remote Kaggle GPU server error: {err_msg}")

                    data = r.json()

                    if "segments" in data:
                        return data

                    # Async Job Mode: Poll until finished
                    colab_task_id = data.get("job_id")
                    if not colab_task_id:
                        raise RuntimeError(f"Unexpected response from Kaggle server: {data}")

                    poll_url = f"{status_base}/{colab_task_id}"
                    start_time = time.time()
                    # Dynamic timeout: Minimum 30 minutes (1800s) or 1.5x duration for long podcasts/gaming videos
                    max_wait = max(1800, int((job.duration or 3600) * 1.5))
                    last_ui_update = 0

                    while time.time() - start_time < max_wait:
                        time.sleep(2)
                        elapsed = int(time.time() - start_time)

                        # Provide live progress feedback so UI never appears stuck
                        if time.time() - last_ui_update >= 2.0:
                            mins, secs = divmod(elapsed, 60)
                            job.stage_message = f"Whisper Large-V3 transcribing on Kaggle GPU ({mins}m {secs:02d}s)..."
                            est_dur = max(300, (job.duration or 600) * 0.35)
                            job.progress = min(64, int(45 + (elapsed / est_dur) * 19))
                            last_ui_update = time.time()

                        try:
                            st_resp = session.get(poll_url, timeout=15)
                            if st_resp.status_code != 200:
                                continue
                            st_data = st_resp.json()
                            status = st_data.get("status")
                            if status == "completed":
                                job.stage_message = "Transcription complete! Parsing AI hooks..."
                                job.progress = 65
                                return st_data.get("result", {})
                            elif status == "error":
                                raise RuntimeError(f"Kaggle GPU transcription failed: {st_data.get('error')}")
                        except requests.exceptions.RequestException:
                            continue

                    timeout_mins = max_wait // 60
                    raise TimeoutError(f"Remote Kaggle GPU transcription timed out after {timeout_mins} minutes.")

                transcription_result = await asyncio.to_thread(_execute_remote_transcription)
                job.progress = 65
                if not job.duration or job.duration == 60.0:
                    job.duration = transcription_result.get("duration", 0.0)
            else:
                raise ValueError("Transcription requires either an uploaded .SRT subtitle file or a Kaggle GPU connection.")

        # Cache internal job state for subsequent AI prompt / rendering
        jobs_internal_data[job_id] = {
            "video_path": video_path,
            "transcription_result": transcription_result,
            "request": request
        }

        # Check if user already supplied custom clips upfront
        if request.custom_clips:
            import json
            custom_data = request.custom_clips
            if isinstance(custom_data, str):
                candidates = parse_llm_clips_json(custom_data, job.duration)
            else:
                candidates = parse_llm_clips_json(json.dumps(custom_data), job.duration)

            await render_job_clips(job_id, video_path, transcription_result, candidates, request)
            return

        # Phase 3: Selection (AI Prompt Mode vs Auto Heuristic)
        if request.selection_mode == "ai_prompt":
            prompt_data = generate_ai_prompt(
                transcription_data=transcription_result,
                num_clips=request.num_clips,
                min_duration=int(request.min_clip_duration),
                max_duration=int(request.max_clip_duration),
                video_title=job.video_title or ""
            )
            job.prompt_text = prompt_data["prompt"]
            job.transcript_summary = prompt_data["transcript_summary"]
            job.status = JobStatus.AWAITING_CLIPS
            job.stage_message = "Transcription ready! Copy AI Prompt for ChatGPT/Gemini and paste JSON."
            job.progress = 68
            save_jobs_to_disk()
            return

        # Auto Heuristic Mode
        job.status = JobStatus.SELECTING
        job.stage_message = "Analyzing speech retention & selecting viral hooks..."
        job.progress = 70

        candidates = select_clips_heuristic(
            transcription_result,
            num_clips=request.num_clips,
            min_duration=float(request.min_clip_duration),
            max_duration=float(request.max_clip_duration)
        )

        await render_job_clips(job_id, video_path, transcription_result, candidates, request)

    except Exception as e:
        import re
        raw_err = str(e)
        clean_err = re.sub(r'\x1b\[[0-9;]*[a-zA-Z]', '', raw_err)
        clean_err = clean_err.replace("ERROR: ", "").strip()
        job.status = JobStatus.FAILED
        job.error = clean_err
        job.stage_message = f"Failed: {clean_err}"
        save_jobs_to_disk()
        print(f"Error processing job {job_id}:")
        traceback.print_exc()
