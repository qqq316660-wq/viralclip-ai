from pathlib import Path
from typing import Optional, Tuple, Dict
from PIL import Image, ImageDraw, ImageFont

def get_font(size: int, bold: bool = True, italic: bool = False) -> ImageFont.FreeTypeFont:
    """Returns a high-quality Truetype font from Windows Fonts or fallback."""
    if italic and bold:
        candidates = ["segoeuiz.ttf", "arialbi.ttf", "calibriz.ttf"]
    elif italic:
        candidates = ["segoeuii.ttf", "ariali.ttf", "calibrii.ttf"]
    elif bold:
        candidates = ["segoeuib.ttf", "arialbd.ttf", "calibrib.ttf", "impact.ttf"]
    else:
        candidates = ["segoeui.ttf", "arial.ttf", "calibri.ttf"]

    for name in candidates:
        p = Path("C:/Windows/Fonts") / name
        if p.exists():
            try:
                return ImageFont.truetype(str(p), size)
            except Exception:
                pass
    return ImageFont.load_default()

def hex_to_rgba(hex_code: str, opacity: float = 1.0) -> Tuple[int, int, int, int]:
    """Converts hex color code string to RGBA tuple."""
    if not hex_code:
        return (255, 255, 255, int(255 * opacity))
    hex_clean = hex_code.lstrip("#")
    if len(hex_clean) == 3:
        hex_clean = "".join([c * 2 for c in hex_clean])
    try:
        r = int(hex_clean[0:2], 16)
        g = int(hex_clean[2:4], 16)
        b = int(hex_clean[4:6], 16)
        a = max(0, min(255, int(255 * opacity)))
        return (r, g, b, a)
    except Exception:
        return (255, 255, 255, int(255 * opacity))

def get_social_card_geometry(
    target_width: int = 1080,
    target_height: int = 1920,
    aspect_ratio: str = "1:1",
    has_hook: bool = False,
    has_footer: bool = False
) -> Dict[str, int]:
    """
    Computes exact pixel geometry for the Social Card overlay container and embedded video window
    to ensure 1:1 synchronization between frontend phone mockup and FFmpeg rendering.
    Enforces even pixel dimensions and coordinates for FFmpeg libx264 compatibility.
    """
    card_w = 960  # Even width
    card_x = (target_width - card_w) // 2  # 60px
    pad = 20
    video_w = card_w - (pad * 2)  # 920px (even)

    if aspect_ratio == "16:9":
        video_h = int(video_w * 9 / 16)
        if video_h % 2 != 0:
            video_h -= 1
    else:
        video_h = video_w  # 920px (even)

    header_h = 136 + (76 if has_hook else 0)
    footer_h = 80 if has_footer else 20
    card_h = header_h + video_h + footer_h + 30
    card_y = (target_height - card_h) // 2
    if card_y % 2 != 0:
        card_y -= 1
    video_x = card_x + pad
    video_y = card_y + header_h + 10
    if video_y % 2 != 0:
        video_y -= 1

    return {
        "card_x": card_x,
        "card_y": card_y,
        "card_w": card_w,
        "card_h": card_h,
        "video_x": video_x,
        "video_y": video_y,
        "video_w": video_w,
        "video_h": video_h,
        "header_h": header_h,
        "footer_h": footer_h
    }

def generate_branding_overlay(
    output_png_path: Path,
    target_width: int = 1080,
    target_height: int = 1920,
    # Hook Text
    hook_enabled: bool = False,
    hook_text: Optional[str] = None,
    hook_color: str = "#000000",
    hook_bg: str = "transparent",
    hook_bg_color: str = "#facc15",
    hook_x: Optional[float] = None,
    hook_y: int = 48,
    # Logo
    logo_path: Optional[Path] = None,
    logo_enabled: bool = False,
    logo_position: str = "top_left",
    logo_x: Optional[float] = None,
    logo_y: Optional[float] = None,
    logo_size: int = 36,
    logo_opacity: float = 1.0,
    # Watermark
    watermark_enabled: bool = False,
    watermark_text: Optional[str] = None,
    watermark_position: str = "bottom_center",
    watermark_x: Optional[float] = None,
    watermark_y: Optional[float] = None,
    watermark_color: str = "#a1a1aa",
    watermark_opacity: float = 0.85,
    # Social Card
    social_card_enabled: bool = False,
    channel_name: Optional[str] = None,
    channel_handle: Optional[str] = None,
    like_subscribe_enabled: bool = False,
    social_card_bg: str = "#0c0f14",
    social_footer_enabled: bool = False,
    corner_radius: int = 14,
    aspect_ratio: str = "1:1",
    card_padding: bool = False,
    **kwargs
) -> Optional[Path]:
    """
    Renders high-resolution, pixel-perfect branding overlays matching the phone mockup:
    - Unified social post card (avatar, handle, retro LIKE AND SUBSCRIBE banner, hook, stats footer)
    - Freeform draggable logo and watermark
    - Top hook headline with transparent or pill container
    """
    has_hook = bool(hook_enabled and hook_text and hook_text.strip())
    has_logo = bool((logo_enabled or social_card_enabled) and logo_path and Path(logo_path).exists())
    has_watermark = bool(watermark_enabled and watermark_text and watermark_text.strip())
    has_card = bool(social_card_enabled)

    # If no branding elements are active, return None
    if not (has_hook or has_logo or has_watermark or has_card):
        return None

    img = Image.new("RGBA", (target_width, target_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. VIRAL SOCIAL POST CARD (Exact Mockup Match)
    if has_card:
        geom = get_social_card_geometry(
            target_width=target_width,
            target_height=target_height,
            aspect_ratio=aspect_ratio,
            has_hook=has_hook,
            has_footer=social_footer_enabled
        )

        cx, cy = geom["card_x"], geom["card_y"]
        cw, ch = geom["card_w"], geom["card_h"]
        vx, vy = geom["video_x"], geom["video_y"]
        vw, vh = geom["video_w"], geom["video_h"]
        rad = max(8, min(40, corner_radius or 14))

        # 1A. Draw Card Outer Frame (Solid Card Background with rounded corners & border)
        card_rgba = hex_to_rgba(social_card_bg or "#0c0f14", 1.0)
        draw.rounded_rectangle(
            [cx, cy, cx + cw, cy + ch],
            radius=rad,
            fill=card_rgba,
            outline=(255, 255, 255, 36),
            width=2
        )

        # 1B. Punch out video window so the underlying video renders with 100% clarity
        # We cut a transparent rectangle where the video sits
        draw.rectangle([vx, vy, vx + vw, vy + vh], fill=(0, 0, 0, 0))
        # Draw video border outline
        draw.rounded_rectangle([vx, vy, vx + vw, vy + vh], radius=10, outline=(255, 255, 255, 25), width=2)

        # 1C. Card Header: Avatar, Channel Name, @Handle
        avatar_size = 96
        avatar_x = cx + 24
        avatar_y = cy + 20

        avatar_drawn = False
        if has_logo:
            try:
                logo_img = Image.open(logo_path).convert("RGBA")
                logo_img = logo_img.resize((avatar_size, avatar_size), Image.Resampling.LANCZOS)
                mask = Image.new("L", (avatar_size, avatar_size), 0)
                mask_draw = ImageDraw.Draw(mask)
                mask_draw.ellipse((0, 0, avatar_size, avatar_size), fill=255)
                img.paste(logo_img, (avatar_x, avatar_y), mask)
                draw.ellipse(
                    (avatar_x - 1, avatar_y - 1, avatar_x + avatar_size + 1, avatar_y + avatar_size + 1),
                    outline=(255, 255, 255, 70),
                    width=2
                )
                avatar_drawn = True
            except Exception as e:
                print(f"Error loading logo for avatar: {e}")

        if not avatar_drawn:
            letter = (channel_name[0] if channel_name and channel_name.strip() else "C").upper()
            draw.ellipse(
                (avatar_x, avatar_y, avatar_x + avatar_size, avatar_y + avatar_size),
                fill=(225, 29, 72, 255),
                outline=(255, 255, 255, 75),
                width=2
            )
            font_letter = get_font(48, bold=True)
            l_bbox = draw.textbbox((0, 0), letter, font=font_letter)
            lw = l_bbox[2] - l_bbox[0]
            lh = l_bbox[3] - l_bbox[1]
            draw.text(
                (avatar_x + (avatar_size - lw) // 2, avatar_y + (avatar_size - lh) // 2 - l_bbox[1]),
                letter,
                fill=(255, 255, 255, 255),
                font=font_letter
            )

        # Channel Name & Handle
        text_x = avatar_x + avatar_size + 18
        font_name = get_font(38, bold=True)
        display_name = (channel_name.strip() if channel_name and channel_name.strip() else "Creator")
        draw.text((text_x, avatar_y + 8), display_name, fill=(255, 255, 255, 255), font=font_name)

        # Verified Checkmark Badge
        name_bbox = draw.textbbox((text_x, avatar_y + 8), display_name, font=font_name)
        badge_x = name_bbox[2] + 10
        badge_y = avatar_y + 14
        badge_r = 13
        draw.ellipse((badge_x, badge_y, badge_x + badge_r * 2, badge_y + badge_r * 2), fill=(30, 215, 96, 255))
        draw.line((badge_x + 7, badge_y + 13, badge_x + 11, badge_y + 18), fill=(0, 0, 0, 255), width=3)
        draw.line((badge_x + 11, badge_y + 18, badge_x + 19, badge_y + 8), fill=(0, 0, 0, 255), width=3)

        # Handle
        raw_handle = (channel_handle.strip() if channel_handle and channel_handle.strip() else "@creator")
        handle_str = f"@{raw_handle.lstrip('@')}"
        font_handle = get_font(28, bold=False)
        draw.text((text_x, avatar_y + 54), handle_str, fill=(148, 163, 184, 230), font=font_handle)

        # 1D. Retro 3D "LIKE AND SUBSCRIBE" Callout Banner
        if like_subscribe_enabled:
            font_ls = get_font(30, bold=True, italic=True)
            ls_txt = "LIKE AND SUBSCRIBE"
            ls_bbox = draw.textbbox((0, 0), ls_txt, font=font_ls)
            lsw = ls_bbox[2] - ls_bbox[0]
            lsx = cx + cw - lsw - 28
            lsy = avatar_y + 28
            # Cyan 3D drop-shadow
            draw.text((lsx + 2, lsy + 2), ls_txt, fill=(0, 240, 255, 240), font=font_ls)
            # Red primary fill
            draw.text((lsx, lsy), ls_txt, fill=(239, 68, 68, 255), font=font_ls)

        # 1E. Hook Caption / Headline inside the card
        if has_hook:
            hook_top = avatar_y + avatar_size + 12
            font_hook = get_font(36, bold=True)
            h_text = hook_text.strip().upper()
            draw.text((avatar_x, hook_top), h_text, fill=(255, 255, 255, 255), font=font_hook)

        # 1F. Social Actions Stats Footer
        if social_footer_enabled:
            footer_y = vy + vh + 14
            # Divider line
            draw.line((cx + 20, footer_y, cx + cw - 20, footer_y), fill=(255, 255, 255, 30), width=1)
            # Stats row
            font_stats = get_font(24, bold=True)
            draw.text((cx + 30, footer_y + 12), "100M Retweets", fill=(148, 163, 184, 220), font=font_stats)
            draw.text((cx + (cw // 2) - 60, footer_y + 12), "10M Quotes", fill=(148, 163, 184, 220), font=font_stats)
            draw.text((cx + cw - 170, footer_y + 12), "1M Likes", fill=(148, 163, 184, 220), font=font_stats)
            # Action row
            font_actions = get_font(20, bold=False)
            draw.text((cx + 30, footer_y + 44), "Chat 24.8K", fill=(148, 163, 184, 180), font=font_actions)
            draw.text((cx + (cw // 2) - 60, footer_y + 44), "Share 10.2M", fill=(148, 163, 184, 180), font=font_actions)
            draw.text((cx + cw - 170, footer_y + 44), "Heart 1.4M", fill=(148, 163, 184, 180), font=font_actions)

    # 2. TOP HOOK HEADLINE (When not inside social card)
    if has_hook and not has_card:
        raw_text = hook_text.strip()
        words = raw_text.split()

        # Canvas width is 1080px. Safe text box is 900px (leaves 90px clean margin on left & right)
        max_line_width = target_width - 180

        # Dynamic font sizing based on word count:
        # 54px for punchy short hooks, 48px for medium, 42px for longer sentences
        if len(words) <= 5:
            base_font_size = 54
        elif len(words) <= 9:
            base_font_size = 48
        else:
            base_font_size = 42

        font_hook = get_font(base_font_size, bold=True)

        # Clean auto-wrap words into balanced lines
        lines = []
        current_words = []
        for word in words:
            test_line = " ".join(current_words + [word])
            bbox = draw.textbbox((0, 0), test_line, font=font_hook)
            if (bbox[2] - bbox[0]) <= max_line_width or not current_words:
                current_words.append(word)
            else:
                lines.append(" ".join(current_words))
                current_words = [word]
        if current_words:
            lines.append(" ".join(current_words))

        # Keep max 3 lines to avoid crowding
        if len(lines) > 3:
            lines = lines[:3]

        # Calculate line metrics (width, height, bbox for each line)
        line_metrics = []
        max_line_w = 0
        line_spacing = 14
        total_text_h = 0
        for line in lines:
            bbox = draw.textbbox((0, 0), line, font=font_hook)
            lw = bbox[2] - bbox[0]
            lh = bbox[3] - bbox[1]
            line_metrics.append((line, lw, lh, bbox))
            if lw > max_line_w:
                max_line_w = lw
            total_text_h += lh
        total_text_h += line_spacing * (len(lines) - 1)

        # Optical Vertical Centering (hy):
        # In Bordered Canvas mode (card_padding): top white/black margin bar is 0 to 480px, center is 240px.
        if card_padding:
            base_center_y = 240
            if hook_y is not None:
                # Map slider (default ~38-48) smoothly around optical center (240px)
                y_offset = (float(hook_y) - 48.0) * 2.2
                center_y = int(base_center_y + y_offset)
                center_y = max(total_text_h // 2 + 40, min(440 - total_text_h // 2, center_y))
            else:
                center_y = base_center_y
            start_y = center_y - (total_text_h // 2)
        else:
            # Clean video mode (9:16 full-bleed)
            if hook_y is not None:
                center_y = int((float(hook_y) / 100.0) * target_height)
                center_y = max(total_text_h // 2 + 50, min(int(target_height * 0.4), center_y))
            else:
                center_y = 200
            start_y = center_y - (total_text_h // 2)

        # Center X position:
        if hook_x is not None:
            center_x = int((float(hook_x) / 100.0) * target_width)
        else:
            center_x = target_width // 2

        text_color = hex_to_rgba(hook_color, 1.0)
        is_dark_text = (text_color[0] * 0.299 + text_color[1] * 0.587 + text_color[2] * 0.114) < 120

        # Background Box (if fill or pill mode)
        if hook_bg in ["fill", "pill"]:
            bg_rgba = hex_to_rgba(hook_bg_color or "#facc15", 1.0)
            pad_x = 36
            pad_y = 18
            box_x0 = center_x - (max_line_w // 2) - pad_x
            box_y0 = start_y - pad_y
            box_x1 = center_x + (max_line_w // 2) + pad_x
            box_y1 = start_y + total_text_h + pad_y
            draw.rounded_rectangle(
                [box_x0, box_y0, box_x1, box_y1],
                radius=18,
                fill=bg_rgba
            )

        # Draw EACH line centered horizontally!
        curr_y = start_y
        for line, lw, lh, bbox in line_metrics:
            # DEAD CENTER: center_x - (lw // 2)
            line_x = center_x - (lw // 2)
            # Ensure line stays within safe screen margins
            line_x = max(20, min(target_width - lw - 20, line_x))
            draw_y = curr_y - bbox[1]

            if hook_bg not in ["fill", "pill"]:
                # Outline / shadow: subtle shadow on dark backgrounds for crisp readability
                if not is_dark_text:
                    for ox, oy in [(-2, -2), (2, -2), (-2, 2), (2, 2), (0, 3)]:
                        draw.text((line_x + ox, draw_y + oy), line, fill=(0, 0, 0, 220), font=font_hook)

            draw.text((line_x, draw_y), line, fill=text_color, font=font_hook)
            curr_y += lh + line_spacing

    # 3. FLOATING BRAND LOGO (Clean Video & Bordered Canvas Modes)
    if has_logo and logo_enabled and not has_card:
        try:
            l_img = Image.open(logo_path).convert("RGBA")
            base_size = int(target_width * 0.12)
            l_w, l_h = l_img.size
            ratio = min(base_size / l_w, base_size / l_h)
            new_w = max(40, int(l_w * ratio))
            new_h = max(40, int(l_h * ratio))
            l_img = l_img.resize((new_w, new_h), Image.Resampling.LANCZOS)

            if logo_opacity < 0.98:
                alpha = l_img.split()[3]
                alpha = alpha.point(lambda p: int(p * max(0.1, min(1.0, logo_opacity))))
                l_img.putalpha(alpha)

            if logo_x is not None and logo_y is not None:
                lx = int((logo_x / 100.0) * target_width)
                ly = int((logo_y / 100.0) * target_height)
            else:
                margin = 50
                if logo_position == "top_center":
                    lx = (target_width - new_w) // 2
                    ly = margin
                elif logo_position == "top_right":
                    lx = target_width - new_w - margin
                    ly = margin
                elif logo_position == "bottom_left":
                    lx = margin
                    ly = target_height - new_h - margin - 80
                elif logo_position == "bottom_center":
                    lx = (target_width - new_w) // 2
                    ly = target_height - new_h - margin - 80
                elif logo_position == "bottom_right":
                    lx = target_width - new_w - margin
                    ly = target_height - new_h - margin - 80
                else:
                    lx = margin
                    ly = margin

            img.paste(l_img, (lx, ly), l_img)
        except Exception as e:
            print(f"Error drawing brand logo overlay: {e}")

    # 4. CHANNEL WATERMARK / ATTRIBUTION TAG (Customizable & Freeform Position)
    if has_watermark:
        w_text = watermark_text.strip()
        font_wm = get_font(32, bold=True)
        w_bbox = draw.textbbox((0, 0), w_text, font=font_wm)
        ww = w_bbox[2] - w_bbox[0]
        wh = w_bbox[3] - w_bbox[1]

        if watermark_x is not None and watermark_y is not None:
            wx = int((watermark_x / 100.0) * target_width)
            wy = int((watermark_y / 100.0) * target_height)
        else:
            wy = target_height - 110
            margin = 60
            if watermark_position == "bottom_left":
                wx = margin
            elif watermark_position == "bottom_right":
                wx = target_width - ww - margin - 32
            else:
                wx = (target_width - ww) // 2

        pad_x = 20
        pad_y = 10
        draw.rounded_rectangle(
            [wx - pad_x, wy - pad_y, wx + ww + pad_x, wy + wh + pad_y],
            radius=14,
            fill=(0, 0, 0, 170),
            outline=(255, 255, 255, 30),
            width=1
        )
        wm_color = hex_to_rgba(watermark_color or "#ffffff", watermark_opacity or 0.85)
        draw.text((wx, wy - w_bbox[1]), w_text, fill=wm_color, font=font_wm)

    output_png_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(output_png_path, "PNG")
    return output_png_path
