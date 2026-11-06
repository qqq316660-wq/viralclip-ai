import subprocess
from pathlib import Path
from typing import Optional, Callable
from app.config import FFMPEG_PATH, FFPROBE_PATH, CLIPS_DIR, DEVICE
from app.models import AspectRatio, FitMode, SubtitleStyle
from app.tracker import build_reframe_filter

def has_audio_stream(file_path: Path) -> bool:
    try:
        r = subprocess.run(
            [FFPROBE_PATH, "-v", "error", "-select_streams", "a", "-show_entries", "stream=codec_type", "-of", "csv=p=0", str(file_path)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        return "audio" in r.stdout.lower()
    except Exception:
        return True

def render_clip(
    source_video_path: Path,
    start_time: float,
    end_time: float,
    ass_subtitle_path: Optional[Path],
    output_clip_path: Path,
    aspect_ratio: AspectRatio = AspectRatio.PORTRAIT_9_16,
    fit_mode: FitMode = FitMode.CROP_FILL,
    music_path: Optional[Path] = None,
    music_volume: float = 0.20,
    original_volume: float = 1.00,
    music_start_time: float = 0.0,
    template_bg_color: Optional[str] = None,
    template_card_padding: bool = False,
    social_card_enabled: bool = False,
    has_hook: bool = False,
    has_footer: bool = False,
    logo_path: Optional[Path] = None,
    logo_position: str = "top_left",
    branding_overlay_path: Optional[Path] = None,
    progress_callback: Optional[Callable[[float, str], None]] = None,
    **kwargs
) -> Path:
    """
    Cuts video segment, reframes to vertical/square/landscape, overlays branding/template elements,
    burns animated ASS karaoke subtitles, and mixes background music track in a single fast FFmpeg pass.
    """
    target_width = 1080 if aspect_ratio != AspectRatio.LANDSCAPE_16_9 else 1920
    target_height = 1920 if (aspect_ratio == AspectRatio.PORTRAIT_9_16 or social_card_enabled or template_card_padding) else (1080 if aspect_ratio == AspectRatio.LANDSCAPE_16_9 else 1080)

    duration = end_time - start_time
    reframe_filter = build_reframe_filter(
        aspect_ratio,
        fit_mode,
        target_width=target_width,
        target_height=target_height,
        card_padding=template_card_padding,
        social_card_enabled=social_card_enabled,
        bg_color=template_bg_color,
        has_hook=has_hook,
        has_footer=has_footer
    )

    is_complex_base = "[bg]" in reframe_filter or "overlay=" in reframe_filter
    has_subtitles = ass_subtitle_path is not None and Path(ass_subtitle_path).exists()
    has_branding = branding_overlay_path is not None and Path(branding_overlay_path).exists()
    has_music = music_path is not None and Path(music_path).exists()

    # Determine input indices
    # Input 0: source_video
    # Next input: branding (if present)
    # Next input: music (if present)
    branding_input_idx = 1 if has_branding else None
    music_input_idx = (2 if has_branding else 1) if has_music else None

    # 1. Base video framing
    if is_complex_base:
        v_chain = f"{reframe_filter}[base]"
    else:
        v_chain = f"[0:v]{reframe_filter}[base]"
    current_label = "[base]"

    # 2. Branding overlay (Hook, Logo, Watermark, Social Card)
    if has_branding:
        v_chain = f"{v_chain};{current_label}[{branding_input_idx}:v]overlay=0:0[branded]"
        current_label = "[branded]"

    # 3. Subtitles
    if has_subtitles:
        escaped_sub = str(ass_subtitle_path).replace("\\", "/").replace(":", "\\:")
        v_chain = f"{v_chain};{current_label}subtitles='{escaped_sub}'[v]"
    else:
        v_chain = f"{v_chain};{current_label}null[v]"

    # Build FFmpeg command
    cmd = [
        FFMPEG_PATH,
        "-y",
        "-ss", f"{start_time:.3f}",
        "-to", f"{end_time:.3f}",
        "-i", str(source_video_path)
    ]

    if has_branding:
        cmd.extend(["-i", str(branding_overlay_path)])

    if not has_music:
        cmd.extend([
            "-filter_complex", v_chain,
            "-map", "[v]",
            "-map", "0:a?",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "20",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            "-movflags", "+faststart",
            str(output_clip_path)
        ])
    else:
        cmd.extend([
            "-stream_loop", "-1",
            "-ss", f"{max(0.0, float(music_start_time)):.3f}",
            "-i", str(music_path)
        ])

        orig_vol = max(0.0, min(2.0, float(original_volume)))
        bgm_vol = max(0.0, min(2.0, float(music_volume)))
        video_has_audio = has_audio_stream(source_video_path)

        if video_has_audio and orig_vol > 0.01:
            a_chain = f"[0:a]volume={orig_vol:.2f}[aorig];[{music_input_idx}:a]volume={bgm_vol:.2f}[abgm];[aorig][abgm]amix=inputs=2:duration=first:dropout_transition=2[a]"
        else:
            a_chain = f"[{music_input_idx}:a]volume={bgm_vol:.2f}[a]"

        filter_complex = f"{v_chain};{a_chain}"

        cmd.extend([
            "-filter_complex", filter_complex,
            "-map", "[v]",
            "-map", "[a]",
            "-t", f"{duration:.3f}",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "20",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            "-movflags", "+faststart",
            str(output_clip_path)
        ])

    if progress_callback:
        progress_callback(50.0, f"Rendering clip ({duration:.1f}s)...")

    result = subprocess.run(
        cmd,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
        errors="replace"
    )
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg render failed: {result.stderr}")

    if progress_callback:
        progress_callback(100.0, "Clip render complete")

    return output_clip_path
