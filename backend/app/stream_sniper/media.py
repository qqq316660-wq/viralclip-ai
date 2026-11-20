"""Stream media handler: yt-dlp stream resolution, rapid audio pulling, section clipping, and probing with cookies."""
import json
import os
import re
import subprocess
import time
from pathlib import Path
from typing import Optional, Tuple
import numpy as np
import soundfile as sf

from . import config

NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)


class _Quiet:
    def debug(self, m): pass
    def info(self, m): pass
    def warning(self, m): pass
    def error(self, m): pass


def _ydl(opts: dict):
    import yt_dlp
    base = {
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "logger": _Quiet(),
        "extract_flat": "in_playlist",
        "playlistend": 1,
        "socket_timeout": 30,
        "retries": 15,
        "fragment_retries": 15,
        "skip_unavailable_fragments": True,
        "continuedl": True,
        "http_chunk_size": 10485760,  # 10MB chunks prevent socket resets
        "concurrent_fragment_downloads": 4,
    }
    # 1. Attach cookies from storage/cookies.txt if present
    cookies_path = config.STORAGE_DIR / "cookies.txt"
    if cookies_path.exists() and cookies_path.stat().st_size > 10:
        base["cookiefile"] = str(cookies_path.resolve())

    # 2. Node.js challenge solver if present
    try:
        from app.config import NODE_PATH
        node_exec = NODE_PATH if (NODE_PATH and os.path.exists(NODE_PATH)) else shutil.which("node")
        if not node_exec and os.path.exists(r"C:\Program Files\nodejs\node.exe"):
            node_exec = r"C:\Program Files\nodejs\node.exe"
        if node_exec and os.path.exists(node_exec):
            base["js_runtimes"] = {"node": {"path": str(node_exec)}}
    except Exception:
        pass

    base.update(opts)
    return yt_dlp.YoutubeDL(base)


def run(cmd: list, cwd=None, timeout=3600) -> str:
    try:
        p = subprocess.run(
            cmd, cwd=cwd, capture_output=True, text=True, encoding="utf-8",
            errors="replace", creationflags=NO_WINDOW, timeout=timeout
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError(f"{Path(str(cmd[0])).name} timed out.")
    if p.returncode != 0:
        raise RuntimeError(f"{Path(str(cmd[0])).name} error: {p.stderr[-1000:]}")
    return p.stdout


def probe(path: Path) -> dict:
    out = run(["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)])
    data = json.loads(out)
    v = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), None)
    if not v:
        raise RuntimeError("No video track found.")
    w, h = int(v.get("width", 1920)), int(v.get("height", 1080))
    rot = str((v.get("side_data_list") or [{}])[0].get("rotation", "0"))
    if rot.lstrip("-") in ("90", "270"):
        w, h = h, w
    duration = float(data.get("format", {}).get("duration", 0.0))
    return {"width": w, "height": h, "duration": duration}


def extract_audio(src: Path, wav: Path, sr: int = 16000):
    run(["ffmpeg", "-y", "-v", "error", "-i", str(src), "-vn", "-ac", "1", "-ar", str(sr), str(wav)])


def load_audio(wav: Path) -> np.ndarray:
    data, sr = sf.read(str(wav), dtype="float32")
    if data.ndim > 1:
        data = data.mean(axis=1)
    if sr != 16000:
        import resampy
        data = resampy.resample(data, sr, 16000)
    return data


def resolve_stream(url: str) -> dict:
    """Resolve live stream info and URLs using yt-dlp with cookie support."""
    opts = {
        "format": "b[height<=1080]/bv*[height<=1080]+ba/b",
    }
    with _ydl(opts) as ydl:
        info = ydl.extract_info(url, download=False)
    
    if not info:
        raise RuntimeError("Could not resolve stream info.")
    
    is_live = bool(info.get("is_live") or info.get("live_status") == "is_live")
    was_live = bool(info.get("was_live") or info.get("live_status") == "was_live")
    
    fmts = info.get("requested_formats") or [info]
    title = info.get("title") or ""
    uploader = info.get("uploader") or info.get("channel") or ""
    duration = float(info.get("duration") or 0.0)

    return {
        "title": title,
        "uploader": uploader,
        "duration": duration,
        "is_live": is_live,
        "was_live": was_live,
        "urls": [f.get("url") for f in fmts if f.get("url")],
        "thumbnail": info.get("thumbnail") or ""
    }


def download_audio_fast(url: str, out_path: Path, progress_cb=None) -> Path:
    """Download stream audio directly via yt-dlp native extraction with live progress tracking."""
    out_path.parent.mkdir(parents=True, exist_ok=True)

    def _hook(d):
        if not progress_cb:
            return
        status = d.get("status")
        if status == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            downloaded = d.get("downloaded_bytes", 0)
            pct = (downloaded / total * 100.0) if total > 0 else 0.0
            speed = d.get("speed")
            speed_str = f"{speed / (1024*1024):.1f} MB/s" if speed else "fast"
            progress_cb(pct, f"Downloading stream audio: {pct:.1f}% ({speed_str})")
        elif status == "finished":
            progress_cb(100.0, "Audio stream download complete!")

    opts = {
        "format": "18/140/ba[ext=m4a]/139/249/ba/b",
        "extractor_args": {"youtube": {"player_client": ["android", "web"]}},
        "outtmpl": str(out_path.with_suffix(".%(ext)s")),
        "progress_hooks": [_hook],
        "concurrent_fragment_downloads": 16,
        "buffersize": 524288,
        "retries": 15,
        "fragment_retries": 15,
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
    }
    with _ydl(opts) as ydl:
        ydl.download([url])
    
    # Locate actual downloaded file
    stem = out_path.stem
    candidates = sorted((p for p in out_path.parent.glob(stem + ".*") if p.suffix not in (".part", ".ytdl")),
                        key=lambda p: p.stat().st_size, reverse=True)
    if not candidates:
        raise RuntimeError("Audio download finished but no file was written.")
    return candidates[0]


def download_audio_section(url: str, out_dir: Path, stem: str, start: float, end: float, progress_cb=None) -> Path:
    """Download ONLY the requested 30-min audio slice via fast unthrottled streaming (~5-10s)."""
    from yt_dlp.utils import download_range_func
    out_dir.mkdir(parents=True, exist_ok=True)
    fmt = "18/140/ba[ext=m4a]/139/249/ba/b"

    def _hook(d):
        if not progress_cb:
            return
        status = d.get("status")
        if status == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            downloaded = d.get("downloaded_bytes", 0)
            pct = (downloaded / total * 100.0) if total > 0 else 0.0
            speed = d.get("speed")
            speed_str = f"{speed / (1024*1024):.1f} MB/s" if speed else "fast"
            progress_cb(pct, f"Downloading 30m audio slice: {pct:.1f}% ({speed_str})")
        elif status == "finished":
            progress_cb(100.0, "30m audio slice ready!")

    opts = {
        "format": fmt,
        "extractor_args": {"youtube": {"player_client": ["android", "web"]}},
        "outtmpl": str(out_dir / (stem + ".%(ext)s")),
        "download_ranges": download_range_func(None, [(max(0.0, start), end)]),
        "force_keyframes_at_cuts": False,
        "concurrent_fragment_downloads": 16,
        "buffersize": 524288,
        "progress_hooks": [_hook],
        "retries": 15,
        "fragment_retries": 15,
        "external_downloader_args": {
            "ffmpeg_i": ["-reconnect", "1", "-reconnect_at_eof", "1", "-reconnect_streamed", "1", "-reconnect_delay_max", "5"]
        },
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
    }
    with _ydl(opts) as ydl:
        ydl.download([url])

    candidates = sorted((p for p in out_dir.glob(stem + ".*") if p.suffix not in (".part", ".ytdl")),
                        key=lambda p: p.stat().st_size, reverse=True)
    if not candidates:
        raise RuntimeError(f"Audio section download failed for {stem}")
    return candidates[0]


def download_section(url: str, out_dir: Path, stem: str, start: float, end: float, height: int = 1080, exact: bool = False) -> Path:
    """Download only the requested time slice of a video via fast native streaming."""
    from yt_dlp.utils import download_range_func
    out_dir.mkdir(parents=True, exist_ok=True)
    if height <= 360:
        fmt = (
            "bv*[protocol=m3u8_native][height<=360]/229/230/604/605/"
            "bv*[protocol=m3u8_native][height<=480]/231/606/"
            "bv*[protocol=m3u8_native]/"
            "bv*[height<=360]/worst[ext=mp4]/worst"
        )
        merge_fmt = None
    else:
        fmt = (
            f"bv*[protocol=m3u8_native][height<={height}]+ba[protocol=m3u8_native]/"
            f"bv*[protocol=m3u8_native][height<={height}]+ba/"
            f"311+234/312+234/612+234/617+234/"
            f"bv*[height<={height}][vcodec^=avc1]+ba[ext=m4a]/"
            f"bv*[height<={height}][ext=mp4]+ba[ext=m4a]/"
            f"bv*[height<={height}]+ba/best[height<={height}]/137+140/best"
        )
        merge_fmt = "mp4"

    opts = {
        "format": fmt,
        "outtmpl": str(out_dir / (stem + ".%(ext)s")),
        "download_ranges": download_range_func(None, [(max(0.0, start), end)]),
        "force_keyframes_at_cuts": False,
        "concurrent_fragment_downloads": 16,
        "buffersize": 524288,
        "retries": 10,
        "fragment_retries": 10,
        "external_downloader_args": {
            "ffmpeg_i": ["-reconnect", "1", "-reconnect_at_eof", "1", "-reconnect_streamed", "1", "-reconnect_delay_max", "5"]
        }
    }
    if merge_fmt:
        opts["merge_output_format"] = merge_fmt
    
    with _ydl(opts) as ydl:
        ydl.download([url])
    
    candidates = sorted((p for p in out_dir.glob(stem + ".*") if p.suffix not in (".part", ".ytdl")),
                        key=lambda p: p.stat().st_size, reverse=True)
    if not candidates:
        raise RuntimeError(f"Section download failed for {stem}")
    return candidates[0]


def find_offset(full: np.ndarray, part: np.ndarray, expected: float, search: float = 20.0) -> float:
    """Audio cross-correlation to find the exact sync offset between downloaded slice and master audio."""
    n = min(len(part), 30 * 16000)
    a0 = max(0, int((expected - search) * 16000))
    hay = full[a0: int((expected + search) * 16000) + n].astype(np.float32)
    needle = part[:n].astype(np.float32)
    if n < 16000 or len(hay) < n or float(np.abs(needle).mean()) < 20:
        return expected
    size = 1 << (len(hay) + n).bit_length()
    corr = np.fft.irfft(np.fft.rfft(hay, size) * np.conj(np.fft.rfft(needle, size)), size)[: len(hay) - n + 1]
    return (a0 + int(np.argmax(corr))) / 16000
