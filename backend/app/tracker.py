from typing import Tuple, Optional
from app.models import AspectRatio, FitMode

def sanitize_ffmpeg_color(col: Optional[str]) -> str:
    if not col:
        return "black"
    col = col.strip()
    if col.startswith("#"):
        return f"0x{col.lstrip('#')}"
    return col

def build_reframe_filter(
    aspect_ratio: AspectRatio,
    fit_mode: FitMode,
    target_width: int = 1080,
    target_height: int = 1920,
    card_padding: bool = False,
    social_card_enabled: bool = False,
    bg_color: Optional[str] = None,
    has_hook: bool = False,
    has_footer: bool = False,
    **kwargs
) -> str:
    """
    Constructs high-performance, high-clarity FFmpeg video filter chains 
    for reframing into vertical 9:16, square 1:1, or landscape 16:9,
    including embedded social card and bordered canvas alignment.
    """
    # Fast, high-quality ambient blurred background filter
    bg_filter_9_16 = (
        f"[0:v]scale=108:192:force_original_aspect_ratio=increase,"
        f"crop=108:192,boxblur=5:2,scale={target_width}:{target_height}:flags=lanczos[bg];"
    )

    # Determine pad_color
    if bg_color and bg_color.strip():
        pad_color = sanitize_ffmpeg_color(bg_color.strip())
    elif fit_mode == FitMode.WHITE_BARS:
        pad_color = "white"
    else:
        pad_color = "black"

    # CASE A: Social Post Card Layout (Framed video embedded inside card)
    if social_card_enabled:
        target_width = 1080
        target_height = 1920
        from app.branding import get_social_card_geometry
        geom = get_social_card_geometry(
            target_width=target_width,
            target_height=target_height,
            aspect_ratio="1:1",
            has_hook=has_hook,
            has_footer=has_footer
        )
        vx = geom["video_x"]
        vy = geom["video_y"]
        vw = geom["video_w"]
        vh = geom["video_h"]

        crop_filter = f"crop='min(iw,ih)':'min(iw,ih)',scale={vw}:{vh}:flags=lanczos"

        # Check backdrop choice behind the social card:
        if (bg_color and bg_color.strip()) or fit_mode in (FitMode.BLACK_BARS, FitMode.WHITE_BARS):
            return f"{crop_filter},pad={target_width}:{target_height}:{vx}:{vy}:{pad_color},setsar=1"
        else:
            # Default: Embedded Ambient Blur
            return (
                f"{bg_filter_9_16}"
                f"[0:v]{crop_filter}[fg];"
                f"[bg][fg]overlay={vx}:{vy},setsar=1"
            )

    # CASE B: Bordered Canvas Mode (Floating Inset Video with Margin Bars)
    if card_padding and aspect_ratio == AspectRatio.PORTRAIT_9_16:
        card_dim = 960
        x_off = (target_width - card_dim) // 2
        y_off = (target_height - card_dim) // 2
        crop_filter = f"crop='min(iw,ih)':'min(iw,ih)',scale={card_dim}:{card_dim}:flags=lanczos"

        if (bg_color and bg_color.strip()) or fit_mode in (FitMode.BLACK_BARS, FitMode.WHITE_BARS):
            return f"{crop_filter},pad={target_width}:{target_height}:{x_off}:{y_off}:{pad_color},setsar=1"
        elif fit_mode == FitMode.BLUR_PADDING:
            return (
                f"{bg_filter_9_16}"
                f"[0:v]{crop_filter}[fg];"
                f"[bg][fg]overlay={x_off}:{y_off},setsar=1"
            )
        else:
            return f"{crop_filter},pad={target_width}:{target_height}:{x_off}:{y_off}:{pad_color},setsar=1"

    # CASE C: Standard 9:16 Portrait (Clean Video)
    if aspect_ratio == AspectRatio.PORTRAIT_9_16:
        if fit_mode == FitMode.BLUR_PADDING:
            return (
                f"{bg_filter_9_16}"
                f"[0:v]scale={target_width}:-2:flags=lanczos[fg];"
                f"[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1"
            )
        elif fit_mode in (FitMode.BLACK_BARS, FitMode.WHITE_BARS) or (bg_color and bg_color.strip()):
            return f"scale={target_width}:-2:force_original_aspect_ratio=decrease:flags=lanczos,pad={target_width}:{target_height}:(ow-iw)/2:(oh-ih)/2:{pad_color},setsar=1"
        else:
            return (
                f"crop='trunc(min(iw,ih*9/16)/2)*2':'trunc(min(ih,iw*16/9)/2)*2':(iw-ow)/2:(ih-oh)/2,"
                f"scale={target_width}:{target_height}:flags=lanczos,setsar=1"
            )

    # CASE D: Square 1:1
    elif aspect_ratio == AspectRatio.SQUARE_1_1:
        if card_padding:
            card_dim = 960
            x_off = (target_width - card_dim) // 2
            y_off = (target_height - card_dim) // 2
            crop_filter = f"crop='min(iw,ih)':'min(iw,ih)',scale={card_dim}:{card_dim}:flags=lanczos"
            return f"{crop_filter},pad={target_width}:{target_height}:{x_off}:{y_off}:{pad_color},setsar=1"

        if fit_mode == FitMode.BLUR_PADDING:
            bg_filter_1_1 = (
                f"[0:v]scale=108:108:force_original_aspect_ratio=increase,"
                f"crop=108:108,boxblur=5:2,scale=1080:1080:flags=lanczos[bg];"
            )
            return (
                f"{bg_filter_1_1}"
                f"[0:v]scale=1080:-2:flags=lanczos[fg];"
                f"[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1"
            )
        elif fit_mode in (FitMode.BLACK_BARS, FitMode.WHITE_BARS) or (bg_color and bg_color.strip()):
            return f"scale=1080:1080:force_original_aspect_ratio=decrease:flags=lanczos,pad=1080:1080:(ow-iw)/2:(oh-ih)/2:{pad_color},setsar=1"
        else:
            return "crop='min(iw,ih)':'min(iw,ih)',scale=1080:1080:flags=lanczos,setsar=1"

    # CASE E: Landscape 16:9
    else:
        if fit_mode == FitMode.BLUR_PADDING:
            return (
                f"[0:v]scale=192:108:force_original_aspect_ratio=increase,crop=192:108,boxblur=5:2,scale=1920:1080:flags=lanczos[bg];"
                f"[0:v]scale=1920:-2:flags=lanczos[fg];"
                f"[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1"
            )
        elif fit_mode in (FitMode.BLACK_BARS, FitMode.WHITE_BARS) or (bg_color and bg_color.strip()):
            return f"scale=1920:1080:force_original_aspect_ratio=decrease:flags=lanczos,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:{pad_color},setsar=1"
        else:
            return "scale=1920:1080:force_original_aspect_ratio=decrease:flags=lanczos,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1"
