import math
from pathlib import Path
from typing import List, Dict
from app.models import SubtitleStyle

def format_ass_timestamp(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = seconds % 60
    return f"{hours}:{minutes:02d}:{secs:05.2f}"

def generate_ass_subtitles(
    words: List[Dict],
    clip_start: float,
    clip_end: float,
    output_ass_path: Path,
    style: SubtitleStyle = SubtitleStyle.HORMOZI,
    position: str = "bottom",
    offset_x: int = 0,
    offset_y: int = 0,
    scale: float = 1.0,
    width: int = 1080,
    height: int = 1920,
    social_card_enabled: bool = False
) -> Path:
    """
    Generates word-by-word or single-word-pop animated ASS subtitles with precise placement.
    """
    # Filter words within the clip range
    clip_words = [
        w for w in words
        if w["start"] >= clip_start - 0.1 and w["end"] <= clip_end + 0.1
    ]

    # Adjust timestamps relative to clip start (0.00s)
    rel_words = []
    for w in clip_words:
        rel_words.append({
            "word": w["word"].strip(),
            "start": max(0.0, w["start"] - clip_start),
            "end": max(0.0, w["end"] - clip_start)
        })

    # Styling settings per preset
    # ASS color format is &HAABBGGRR (Blue, Green, Red)
    font_italic = 0
    border_style = 1
    back_color = "&H80000000"

    if style == SubtitleStyle.SINGLE_WORD_POP:
        # High-impact Single Word Punch (1-word pop)
        font_name = "Arial Black"
        base_font_size = 92
        primary_color = "&H0000FFFF"   # Vivid Yellow
        highlight_color = "&H00FFFFFF" # Crisp White
        outline_color = "&H00000000"   # Black
        outline_width = 12
    elif style == SubtitleStyle.HORMOZI:
        # Bold Yellow active, White text, Black thick outline
        font_name = "Arial Black"
        base_font_size = 74
        primary_color = "&H00FFFFFF"   # White
        highlight_color = "&H0000FFFF" # Vivid Yellow
        outline_color = "&H00000000"   # Black
        outline_width = 9
    elif style == SubtitleStyle.MRBEAST:
        # Dynamic Green highlight with high bounce
        font_name = "Impact"
        base_font_size = 78
        primary_color = "&H00FFFFFF"
        highlight_color = "&H0000FF33" # Neon Green
        outline_color = "&H00000000"
        outline_width = 11
    elif style == SubtitleStyle.ALI_ABDAAL:
        # Clean modern sans with soft lavender accent
        font_name = "Segoe UI"
        base_font_size = 68
        primary_color = "&H00F0F0F0"
        highlight_color = "&H00F88C81" # Soft Lavender
        outline_color = "&H00111111"
        outline_width = 5
    elif style == SubtitleStyle.IMAN_GADZHI:
        # Luxury bold italic with gold shimmer
        font_name = "Georgia"
        font_italic = -1
        base_font_size = 72
        primary_color = "&H00FFFFFF"
        highlight_color = "&H000B9EF5" # Luxury Gold
        outline_color = "&H00000000"
        outline_width = 7
    elif style == SubtitleStyle.TIKTOK_BOUNCE:
        # High-energy TikTok red/coral karaoke
        font_name = "Arial Black"
        base_font_size = 76
        primary_color = "&H00FFFFFF"
        highlight_color = "&H004444EF" # TikTok Coral Red
        outline_color = "&H00000000"
        outline_width = 10
    elif style == SubtitleStyle.PODCAST_BOX:
        # Dark translucent pill box with white text
        font_name = "Segoe UI"
        base_font_size = 64
        primary_color = "&H00FFFFFF"
        highlight_color = "&H0000D71E" # Spotify Green
        outline_color = "&H00000000"
        outline_width = 0
        border_style = 3
        back_color = "&H90141414"
    elif style == SubtitleStyle.COMIC_PUNCH:
        # Angled dynamic comic font with yellow fill
        font_name = "Comic Sans MS"
        base_font_size = 74
        primary_color = "&H00FFFFFF"
        highlight_color = "&H0024BFFB" # Vibrant Yellow-Amber
        outline_color = "&H00000000"
        outline_width = 9
    elif style == SubtitleStyle.VELOCITY:
        # Electric cyan pop with sharp black outline
        font_name = "Impact"
        base_font_size = 76
        primary_color = "&H00FFFFFF"
        highlight_color = "&H00D4B606" # Electric Cyan
        outline_color = "&H00000000"
        outline_width = 10
    else:  # MINIMAL
        font_name = "Segoe UI"
        base_font_size = 58
        primary_color = "&H00E5E5E5"
        highlight_color = "&H00FFFFFF"
        outline_color = "&H00111111"
        outline_width = 4

    font_size = max(24, int(base_font_size * (scale or 1.0)))

    # Compute center coordinates for subtitle placement
    # Scale user drag offsets to output resolution (preview phone screen is ~270x520)
    scaled_offset_x = int((offset_x or 0) * (width / 270.0))
    scaled_offset_y = int((offset_y or 0) * (height / 520.0))
    cx = int(width / 2) + scaled_offset_x

    pos_str = (position or "bottom").lower()
    if social_card_enabled:
        # Centered within the embedded video window of the social card
        if pos_str == "top":
            cy = int(height * 0.44) + scaled_offset_y
        elif pos_str == "center":
            cy = int(height * 0.51) + scaled_offset_y
        else:  # "bottom"
            cy = int(height * 0.56) + scaled_offset_y
    else:
        # Standard vertical shorts framing
        if pos_str == "top":
            cy = int(height * 0.18) + scaled_offset_y
        elif pos_str == "center":
            cy = int(height * 0.50) + scaled_offset_y
        else:  # "bottom"
            cy = int(height * 0.74) + scaled_offset_y

    header = f"""[Script Info]
Title: ViralClip Subtitles
ScriptType: v4.00+
WrapStyle: 0
PlayResX: {width}
PlayResY: {height}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_name},{font_size},{primary_color},&H000000FF,{outline_color},{back_color},-1,{font_italic},0,0,100,100,1,0,{border_style},{outline_width},2,5,40,40,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    events = []

    if style == SubtitleStyle.SINGLE_WORD_POP:
        # Single-Word explosive pop: each word rendered individually
        for w in rel_words:
            w_start = format_ass_timestamp(w["start"])
            w_end = format_ass_timestamp(w["end"])
            raw_text = w["word"].upper()
            # Pop zoom animation using ASS transform tag
            events.append(f"Dialogue: 0,{w_start},{w_end},Default,,0,0,0,,{{\\pos({cx},{cy})\\fscx125\\fscy125\\t(0,75,\\fscx100\\fscy100)}}{raw_text}")
    else:
        # Multi-word phrase karaoke highlight
        phrase_chunk_size = 4 if style in (SubtitleStyle.HORMOZI, SubtitleStyle.MRBEAST, SubtitleStyle.TIKTOK_BOUNCE) else 5
        grouped_phrases = []
        for i in range(0, len(rel_words), phrase_chunk_size):
            grouped_phrases.append(rel_words[i:i + phrase_chunk_size])

        for phrase in grouped_phrases:
            if not phrase:
                continue

            for active_idx, target_word in enumerate(phrase):
                w_start = format_ass_timestamp(target_word["start"])
                w_end = format_ass_timestamp(target_word["end"])

                tokens = []
                for idx, item in enumerate(phrase):
                    raw_text = item["word"].upper() if style in (SubtitleStyle.HORMOZI, SubtitleStyle.MRBEAST, SubtitleStyle.TIKTOK_BOUNCE, SubtitleStyle.VELOCITY) else item["word"]
                    if idx == active_idx:
                        tokens.append(f"{{\\c{highlight_color}\\fscx112\\fscy112}}{raw_text}{{\\r\\c{primary_color}}}")
                    else:
                        tokens.append(f"{{\\c{primary_color}}}{raw_text}")

                line_text = " ".join(tokens)
                events.append(f"Dialogue: 0,{w_start},{w_end},Default,,0,0,0,,{{\\pos({cx},{cy})}}{line_text}")

    content = header + "\n".join(events) + "\n"
    output_ass_path.write_text(content, encoding="utf-8")
    return output_ass_path
