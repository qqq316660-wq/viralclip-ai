import os
import re
import subprocess
from pathlib import Path
from typing import Callable, Dict, Optional, Tuple
import yt_dlp

from app.config import DOWNLOADS_DIR, AUDIO_DIR, FFMPEG_PATH, NODE_PATH, COOKIES_FILE

def get_base_ydl_opts(extra_opts: Optional[dict] = None) -> dict:
    """
    Constructs high-resilience yt-dlp options configured with Node.js BotGuard bypass,
    automatic cookie loading, and adaptive chunking.
    """
    opts = {
        "ffmpeg_location": FFMPEG_PATH,
        "quiet": True,
        "no_warnings": True,
        "retries": 15,
        "fragment_retries": 15,
        "skip_unavailable_fragments": True,
        "continuedl": True,
        "file_access_retries": 5,
        "socket_timeout": 30,
        "http_chunk_size": 10485760,  # 10MB chunks prevent socket resets
    }

    # 1. Enable Node.js challenge solver for YouTube BotGuard & JS challenges bypass
    if NODE_PATH and os.path.exists(NODE_PATH):
        opts["js_runtimes"] = {"node": {"path": NODE_PATH}}
        opts["remote_components"] = {"ejs:github": {}}

    # 2. Attach cookies if user uploaded/synced them
    if COOKIES_FILE.exists() and COOKIES_FILE.stat().st_size > 10:
        opts["cookiefile"] = str(COOKIES_FILE.resolve())

    # 3. Enable browser impersonation via curl_cffi for Cloudflare anti-bot bypass
    try:
        import curl_cffi
        extractor_args = opts.get("extractor_args", {})
        extractor_args["generic"] = {"impersonate": ["chrome"]}
        opts["extractor_args"] = extractor_args
    except Exception:
        pass

    if extra_opts:
        opts.update(extra_opts)
    return opts

def normalize_video_url(url: str) -> str:
    """Normalizes video URLs, converting transcript URLs to actual video links."""
    if not url:
        return url
    trimmed = url.strip()
    if "youtube-transcript.io" in trimmed:
        match = re.search(r'[?&]id=([\w-]{11})', trimmed)
        if match:
            return f"https://www.youtube.com/watch?v={match.group(1)}"
    if "turboscribe.ai" in trimmed:
        raise RuntimeError(
            "TurboScribe.ai is a subtitle transcription website, not a video stream. "
            "Please enter a valid YouTube or direct video link."
        )
    return trimmed

def _clean_error(err_str: str) -> str:
    """Converts cryptic yt-dlp error traces into clear, actionable messages."""
    clean = re.sub(r'\x1b\[[0-9;]*[a-zA-Z]', '', err_str)
    clean = clean.replace("ERROR: ", "").strip()

    if "Cloudflare anti-bot challenge" in clean or "generic:impersonate" in clean:
        return (
            "The entered link is a website protected by Cloudflare anti-bot challenge, not a video stream. "
            "Please make sure you are pasting a valid YouTube video link (e.g. https://www.youtube.com/watch?v=...) or upload the video directly."
        )
    if "Sign in to confirm you're not a bot" in clean or "confirm you're not a bot" in clean:
        return (
            "YouTube BotGuard triggered: YouTube requires account authentication for this link. "
            "Click '🍪 YouTube Cookies' above to sync your cookies.txt, or download the video via browser and upload directly."
        )
    if "Sign in to confirm your age" in clean or "age-restricted" in clean.lower():
        return (
            "Age-restricted video: YouTube requires account login. "
            "Please click '🍪 YouTube Cookies' above to load your cookies.txt."
        )
    if "This video is unavailable" in clean or "Video unavailable" in clean:
        return "This video is unavailable or has been removed from YouTube."
    if "Private video" in clean:
        return "This is a private video. Load your YouTube cookies.txt to access private videos."

    return clean

def get_video_info(url: str) -> dict:
    """
    Extracts video metadata and available qualities using yt-dlp with automatic BotGuard solving.
    """
    url = normalize_video_url(url)
    ydl_opts = get_base_ydl_opts({"skip_download": True})

    info = None
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except Exception as e:
        # Fallback 1: Try with mobile/embedded client extractor args if blocked
        try:
            fallback_opts = get_base_ydl_opts({
                "skip_download": True,
                "extractor_args": {
                    "youtube": {
                        "player_client": ["android", "ios", "web"]
                    }
                }
            })
            with yt_dlp.YoutubeDL(fallback_opts) as ydl:
                info = ydl.extract_info(url, download=False)
        except Exception as e2:
            raise RuntimeError(_clean_error(str(e2) or str(e)))

    if not info:
        raise RuntimeError("Could not retrieve video information from the provided link.")

    title = info.get("title", "Untitled Video")
    duration = float(info.get("duration", 0.0))
    thumbnail = info.get("thumbnail")
    uploader = info.get("uploader") or info.get("channel") or ""

    formats = info.get("formats", [])
    heights = set()
    for f in formats:
        h = f.get("height")
        if h and isinstance(h, int):
            heights.add(h)

    standard_qualities = [2160, 1440, 1080, 720, 480, 360, 240]
    available = []
    for q in standard_qualities:
        if any(h >= q for h in heights):
            available.append(f"{q}p")

    if not available:
        available = ["1080p", "720p", "480p", "best"]
    elif "best" not in available:
        available.append("best")

    return {
        "title": title,
        "duration": duration,
        "thumbnail": thumbnail,
        "uploader": uploader,
        "available_qualities": available
    }

def download_video(
    url: str,
    output_prefix: str,
    progress_callback: Optional[Callable[[float, str], None]] = None,
    quality: Optional[str] = "1080p"
) -> Tuple[Path, str, float]:
    """
    Downloads video using yt-dlp with chosen quality, Node.js BotGuard bypass, and adaptive chunking.
    """
    url = normalize_video_url(url)
    video_template = str(DOWNLOADS_DIR / f"{output_prefix}_raw.%(ext)s")

    def _hook(d):
        if d.get("status") == "downloading" and progress_callback:
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 1
            downloaded = d.get("downloaded_bytes") or 0
            percent = (downloaded / total) * 100
            q_label = quality if quality else "default"
            progress_callback(percent, f"Downloading ({q_label}): {percent:.1f}%")

    # Format selector based on chosen quality with broad stream fallback
    q_str = (quality or "1080p").lower().strip()
    if q_str == "1080p":
        fmt = "bestvideo[height<=1080]+bestaudio/best[height<=1080]/bestvideo+bestaudio/best"
    elif q_str == "720p":
        fmt = "bestvideo[height<=720]+bestaudio/best[height<=720]/bestvideo+bestaudio/best"
    elif q_str == "480p":
        fmt = "bestvideo[height<=480]+bestaudio/best[height<=480]/bestvideo+bestaudio/best"
    elif q_str == "360p":
        fmt = "bestvideo[height<=360]+bestaudio/best[height<=360]/bestvideo+bestaudio/best"
    elif q_str.endswith("p") and q_str[:-1].isdigit():
        h = q_str[:-1]
        fmt = f"bestvideo[height<={h}]+bestaudio/best[height<={h}]/bestvideo+bestaudio/best"
    else:
        fmt = "bestvideo+bestaudio/best"

    ydl_opts = get_base_ydl_opts({
        "format": fmt,
        "outtmpl": video_template,
        "merge_output_format": "mp4",
        "progress_hooks": [_hook],
        "noprogress": True,
    })

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            title = info.get("title", "Untitled Video")
            duration = float(info.get("duration", 0.0))
            video_filename = ydl.prepare_filename(info)
    except Exception as e:
        # Fallback with smaller 5MB chunks and adaptive clients if specific format failed
        if progress_callback:
            progress_callback(15.0, "Adapting stream & retrying download...")
        try:
            fallback_opts = get_base_ydl_opts({
                "format": "best",
                "outtmpl": video_template,
                "merge_output_format": "mp4",
                "progress_hooks": [_hook],
                "http_chunk_size": 5242880,  # 5MB chunks
                "extractor_args": {
                    "youtube": {
                        "player_client": ["android", "ios", "web"]
                    }
                }
            })
            with yt_dlp.YoutubeDL(fallback_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                title = info.get("title", "Untitled Video")
                duration = float(info.get("duration", 0.0))
                video_filename = ydl.prepare_filename(info)
        except Exception as e2:
            raise RuntimeError(_clean_error(str(e2) or str(e)))

    file_path = Path(video_filename)
    if not file_path.exists():
        mp4_path = file_path.with_suffix(".mp4")
        if mp4_path.exists():
            file_path = mp4_path

    return file_path, title, duration

def extract_audio(video_path: Path, output_audio_path: Path) -> Path:
    """
    Extracts audio from video file for Whisper transcription.
    If output is .mp3, compresses to 64k mono for lightning-fast remote upload without SSL socket stalls.
    """
    ext = output_audio_path.suffix.lower()
    if ext == ".mp3":
        cmd = [
            FFMPEG_PATH,
            "-y",
            "-i", str(video_path),
            "-vn",
            "-acodec", "libmp3lame",
            "-b:a", "32k",
            "-ar", "16000",
            "-ac", "1",
            str(output_audio_path)
        ]
    else:
        cmd = [
            FFMPEG_PATH,
            "-y",
            "-i", str(video_path),
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            str(output_audio_path)
        ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg audio extraction failed: {result.stderr}")
    return output_audio_path
