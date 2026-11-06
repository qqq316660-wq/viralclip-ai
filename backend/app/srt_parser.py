import re
from pathlib import Path
from typing import Dict, List, Tuple

def parse_time_srt(time_str: str) -> float:
    """
    Parses '00:01:23,456' or '00:01:23.456' into seconds.
    """
    time_str = time_str.strip().replace(",", ".")
    parts = time_str.split(":")
    if len(parts) == 3:
        h, m, s = parts
        return int(h) * 3600 + int(m) * 60 + float(s)
    elif len(parts) == 2:
        m, s = parts
        return int(m) * 60 + float(s)
    return float(time_str)

def parse_srt_file(file_path: Path) -> Dict:
    """
    Parses .srt or .vtt file into segments and word-level timestamps.
    Interpolates timestamps across words for karaoke ASS rendering.
    """
    content = file_path.read_text(encoding="utf-8", errors="replace")
    
    # Normalize newlines
    content = content.replace("\r\n", "\n").replace("\r", "\n")
    
    # Regex to match timestamp line: 00:00:01,000 --> 00:00:04,500
    timestamp_pattern = re.compile(
        r"(\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3})"
    )

    blocks = content.split("\n\n")
    segments = []
    all_words = []
    seg_id = 0

    min_start = float("inf")
    max_end = 0.0

    for block in blocks:
        lines = [line.strip() for line in block.split("\n") if line.strip()]
        if not lines:
            continue

        match = None
        text_lines = []
        for line in lines:
            m = timestamp_pattern.search(line)
            if m:
                match = m
            elif match:
                # Text after timestamp line
                # Strip HTML / WebVTT tags like <c.color> or <b>
                clean_line = re.sub(r"<[^>]+>", "", line)
                if clean_line:
                    text_lines.append(clean_line)

        if match and text_lines:
            start_sec = round(parse_time_srt(match.group(1)), 3)
            end_sec = round(parse_time_srt(match.group(2)), 3)
            raw_text = " ".join(text_lines)

            if end_sec <= start_sec:
                continue

            min_start = min(min_start, start_sec)
            max_end = max(max_end, end_sec)

            # Interpolate word-level timestamps evenly across the segment
            words_in_text = raw_text.split()
            word_count = len(words_in_text)
            seg_words = []

            if word_count > 0:
                duration = end_sec - start_sec
                step = duration / word_count
                for idx, w in enumerate(words_in_text):
                    w_start = round(start_sec + idx * step, 3)
                    w_end = round(start_sec + (idx + 1) * step, 3)
                    seg_words.append({
                        "word": w,
                        "start": w_start,
                        "end": w_end
                    })
                    all_words.append({
                        "word": w,
                        "start": w_start,
                        "end": w_end
                    })

            segments.append({
                "id": seg_id,
                "start": start_sec,
                "end": end_sec,
                "text": raw_text,
                "words": seg_words
            })
            seg_id += 1

    if min_start == float("inf"):
        min_start = 0.0

    return {
        "language": "en",
        "duration": round(max_end, 2),
        "srt_range": {
            "start": round(min_start, 2),
            "end": round(max_end, 2),
            "duration": round(max_end - min_start, 2)
        },
        "segments": segments,
        "words": all_words
    }
