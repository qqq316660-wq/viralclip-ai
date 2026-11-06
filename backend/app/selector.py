import math
import uuid
from typing import Dict, List, Optional
from app.models import ClipCandidate

# High-engagement viral trigger keywords
ENGAGEMENT_WORDS = {
    "secret", "mistake", "shocking", "never", "always", "money", "dollar", "how", "why",
    "stop", "truth", "crazy", "unbelievable", "best", "worst", "future", "billion",
    "million", "hack", "trick", "lesson", "advice", "rule", "actually", "remember"
}

def select_clips_heuristic(
    transcription_data: Dict,
    num_clips: int = 3,
    min_duration: float = 25.0,
    max_duration: float = 60.0
) -> List[ClipCandidate]:
    """
    Evaluates transcript segments to identify high-retention 25-60s candidate clips.
    Scores based on word rate, engagement keywords, punctuation climax, and coherence.
    """
    segments = transcription_data.get("segments", [])
    if not segments:
        return []

    candidates = []

    # Slide through segments to form continuous candidates between min_duration and max_duration
    for i in range(len(segments)):
        seg_start = segments[i]["start"]
        current_text = []
        seg_end = seg_start

        for j in range(i, len(segments)):
            seg_end = segments[j]["end"]
            current_text.append(segments[j]["text"])
            curr_duration = seg_end - seg_start

            if curr_duration >= min_duration:
                if curr_duration <= max_duration:
                    full_str = " ".join(current_text)
                    words = full_str.lower().split()
                    
                    # Calculate engagement score
                    keyword_matches = sum(1 for w in words if w.strip(".,!?\"'") in ENGAGEMENT_WORDS)
                    has_question = 1 if "?" in full_str else 0
                    word_density = len(words) / curr_duration  # 2.2 to 3.5 words/sec is engaging

                    score = 65  # Base score
                    score += min(20, keyword_matches * 5)
                    score += 10 if has_question else 0
                    if 2.2 <= word_density <= 3.8:
                        score += 10

                    score = min(98, max(50, score))

                    headline = current_text[0][:40] + "..." if len(current_text[0]) > 40 else current_text[0]

                    candidates.append({
                        "start_time": seg_start,
                        "end_time": seg_end,
                        "duration": round(curr_duration, 2),
                        "score": score,
                        "headline": headline,
                        "text": full_str
                    })
                else:
                    break

    # Sort candidates by score
    candidates.sort(key=lambda x: x["score"], reverse=True)

    # Pick top non-overlapping clips
    selected_clips: List[ClipCandidate] = []
    for c in candidates:
        overlap = False
        for s in selected_clips:
            # Check for timestamp overlap
            if not (c["end_time"] <= s.start_time or c["start_time"] >= s.end_time):
                overlap = True
                break

        if not overlap:
            cid = f"clip_{uuid.uuid4().hex[:8]}"
            selected_clips.append(
                ClipCandidate(
                    id=cid,
                    title=f"Viral Highlight #{len(selected_clips) + 1}",
                    start_time=c["start_time"],
                    end_time=c["end_time"],
                    duration=c["duration"],
                    hook_score=c["score"],
                    hook_reason="High speaking density with strong retention keywords and punchy delivery.",
                    suggested_headline=c["headline"],
                    description=f"{c['headline']} Watch until the end for the full breakdown.",
                    hashtags=["#shorts", "#viral", "#trending", "#fyp", "#content"]
                )
            )

        if len(selected_clips) >= num_clips:
            break

    # Fallback if video is too short or segments are limited
    if not selected_clips and segments:
        total_dur = transcription_data.get("duration", 30.0)
        selected_clips.append(
            ClipCandidate(
                id=f"clip_{uuid.uuid4().hex[:8]}",
                title="Viral Highlight #1",
                start_time=0.0,
                end_time=min(max_duration, total_dur),
                duration=min(max_duration, total_dur),
                hook_score=85,
                hook_reason="Primary opening hook segment.",
                suggested_headline=segments[0]["text"][:40],
                description=f"{segments[0]['text'][:60]}... Watch till the end!",
                hashtags=["#shorts", "#viral", "#trending", "#fyp", "#reels"]
            )
        )

    return selected_clips


def format_seconds_to_time(seconds: float) -> str:
    """Converts seconds float to MM:SS or HH:MM:SS format."""
    total_sec = max(0.0, seconds)
    hours = int(total_sec // 3600)
    minutes = int((total_sec % 3600) // 60)
    secs = int(total_sec % 60)
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


def parse_time_flexible(val) -> float:
    """
    Parses timestamp from various formats:
    - 75.5 (float/int)
    - "75.5" (string float)
    - "01:15" (MM:SS)
    - "00:01:15" or "00:01:15.500" (HH:MM:SS)
    """
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)

    s = str(val).strip().replace(",", ".")
    # If pure number
    try:
        return float(s)
    except ValueError:
        pass

    # Colon separated
    parts = s.split(":")
    try:
        if len(parts) == 3:
            h, m, sec = parts
            return int(h) * 3600 + int(m) * 60 + float(sec)
        elif len(parts) == 2:
            m, sec = parts
            return int(m) * 60 + float(sec)
    except Exception:
        pass

    return 0.0


def format_transcript_for_prompt(segments: List[Dict], max_block_sec: float = 12.0) -> str:
    """
    Formats raw transcript segments into clean, condensed dialogue blocks
    with timestamps (e.g. [01:15 - 01:27] Speaker: text).
    """
    if not segments:
        return "(No transcript available)"

    blocks = []
    curr_start = None
    curr_end = None
    curr_texts = []

    for seg in segments:
        s_start = seg.get("start", 0.0)
        s_end = seg.get("end", 0.0)
        s_text = seg.get("text", "").strip()
        if not s_text:
            continue

        if curr_start is None:
            curr_start = s_start
            curr_end = s_end
            curr_texts.append(s_text)
        elif (s_end - curr_start) <= max_block_sec and not curr_texts[-1].endswith((".", "!", "?")):
            curr_end = s_end
            curr_texts.append(s_text)
        else:
            # Output previous block
            start_fmt = format_seconds_to_time(curr_start)
            end_fmt = format_seconds_to_time(curr_end)
            block_content = " ".join(curr_texts)
            blocks.append(f"[{start_fmt} - {end_fmt}] {block_content}")
            curr_start = s_start
            curr_end = s_end
            curr_texts = [s_text]

    if curr_start is not None and curr_texts:
        start_fmt = format_seconds_to_time(curr_start)
        end_fmt = format_seconds_to_time(curr_end)
        block_content = " ".join(curr_texts)
        blocks.append(f"[{start_fmt} - {end_fmt}] {block_content}")

    return "\n".join(blocks)


def generate_ai_prompt(
    transcription_data: Dict,
    num_clips: int = 3,
    min_duration: int = 25,
    max_duration: int = 60,
    video_title: str = ""
) -> Dict[str, str]:
    """
    Constructs an optimized prompt for ChatGPT / Claude / Gemini Web
    with formatted transcript and strict JSON response instructions.
    """
    segments = transcription_data.get("segments", [])
    formatted_transcript = format_transcript_for_prompt(segments)
    title_str = f'"{video_title}"' if video_title else "this video"

    prompt = f"""You are an elite short-form video editor specializing in viral YouTube Shorts, Instagram Reels, and TikToks.

Analyze the timestamped transcript below from {title_str} and select the top {num_clips} most viral, high-retention moments.

CRITICAL VIRAL CRITERIA:
1. DURATION: Every clip MUST be between {min_duration} and {max_duration} seconds long.
2. KILLER OPENING HOOK (FIRST 3 SECONDS): The clip must start with a compelling question, shocking revelation, counter-intuitive statement, or intense curiosity gap that stops people from scrolling.
3. COMPLETE STORY ARC / PUNCHLINE: The clip must deliver on its hook and end on a satisfying conclusion, punchline, or valuable takeaway. Never end mid-sentence!
4. VIRALITY SCORE & RANKING (50-99): Rate each clip's virality and audience retention potential with an integer score ("hook_score") from 50 to 99. Evaluate curiosity strength, emotional tension, and payoff. Sort the clips in descending order so the #1 highest-scoring viral short appears first.
5. NON-OVERLAPPING: Selected clips must not overlap each other in time.

OUTPUT FORMAT:
Return ONLY a valid JSON array of objects without any conversational chit-chat, preamble, or commentary outside the JSON array.
Use this exact JSON schema:

[
  {{
    "start_time": "00:01:15",
    "end_time": "00:01:52",
    "hook_score": 96,
    "hook_reason": "High emotional tension in the opening 3 seconds with an unexpected punchline payoff",
    "hook": "Short Catchy Hook Headline (Max 6 words)",
    "suggested_headline": "Short Catchy Title (Max 7 words)",
    "description": "Engaging 1-2 sentence caption for YouTube Shorts & Reels",
    "hashtags": ["#shorts", "#viral", "#trending", "#mindset", "#success"]
  }}
]

TRANSCRIPT:
{formatted_transcript}
"""
    return {
        "prompt": prompt,
        "transcript_summary": formatted_transcript
    }


def parse_llm_clips_json(raw_text: str, total_duration: Optional[float] = None) -> List[ClipCandidate]:
    """
    Sanitizes and parses LLM JSON output (handling markdown code blocks,
    surrounding chit-chat, and various timestamp formats).
    """
    import json
    import re

    cleaned = raw_text.strip()

    # 1. Extract JSON array block using regex
    # Match ```json [ ... ] ``` or just [ ... ]
    json_match = re.search(r"```(?:json)?\s*(\[\s*\{.*?\}\s*\])\s*```", cleaned, re.DOTALL)
    if json_match:
        cleaned = json_match.group(1).strip()
    else:
        # Fallback to finding outermost brackets [ ... ]
        start_idx = cleaned.find("[")
        end_idx = cleaned.rfind("]")
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            cleaned = cleaned[start_idx : end_idx + 1].strip()

    try:
        data = json.loads(cleaned)
    except Exception as e:
        raise ValueError(f"Could not parse valid JSON from AI response: {str(e)}")

    if not isinstance(data, list):
        raise ValueError("AI response must be a JSON array of clip objects.")

    candidates: List[ClipCandidate] = []
    for idx, item in enumerate(data):
        if not isinstance(item, dict):
            continue

        raw_start = item.get("start_time", 0.0)
        raw_end = item.get("end_time", 0.0)

        start_sec = parse_time_flexible(raw_start)
        end_sec = parse_time_flexible(raw_end)

        # Fallback for duration if end_time wasn't directly provided
        if end_sec <= start_sec and "duration" in item:
            end_sec = start_sec + parse_time_flexible(item["duration"])

        # If end is still <= start, skip invalid
        if end_sec <= start_sec:
            continue

        if total_duration and end_sec > total_duration:
            end_sec = total_duration

        dur = round(end_sec - start_sec, 2)
        if dur < 5.0:
            continue

        # Score parsing & clamping (support hook_score, virality_score, score, viral_score)
        raw_score = (
            item.get("hook_score")
            or item.get("virality_score")
            or item.get("score")
            or item.get("viral_score")
            or 88
        )
        try:
            score = int(raw_score)
            score = max(50, min(99, score))
        except (ValueError, TypeError):
            score = 88

        # Hashtags sanitizing
        raw_tags = item.get("hashtags", [])
        clean_tags = []
        if isinstance(raw_tags, list):
            for t in raw_tags:
                tag_str = str(t).strip()
                if tag_str:
                    if not tag_str.startswith("#"):
                        tag_str = f"#{tag_str}"
                    clean_tags.append(tag_str)
        elif isinstance(raw_tags, str):
            clean_tags = [t.strip() for t in raw_tags.split() if t.strip()]

        cid = str(item.get("id")) if item.get("id") else f"clip_{uuid.uuid4().hex[:8]}"
        raw_hook = str(item.get("hook") or item.get("suggested_headline") or item.get("title") or "").strip()
        raw_headline = str(item.get("suggested_headline") or item.get("hook") or "").strip()
        raw_title = str(item.get("title") or "").strip()
        # Per user request: use hook or suggested_headline from JSON as title and headline!
        title = raw_hook if raw_hook else (raw_headline or raw_title or f"Viral Moment #{idx + 1}")
        headline = raw_hook or raw_headline or title
        reason = str(item.get("hook_reason") or item.get("reason") or item.get("virality_reason") or "").strip()
        desc = str(item.get("description") or f"{title}. Watch till the end for the full breakdown!").strip()

        candidates.append(
            ClipCandidate(
                id=cid,
                title=title,
                start_time=round(start_sec, 2),
                end_time=round(end_sec, 2),
                duration=dur,
                hook_score=score,
                hook_reason=reason,
                suggested_headline=headline,
                hook=raw_hook or headline,
                description=desc,
                hashtags=clean_tags[:5] if clean_tags else ["#shorts", "#viral", "#fyp"]
            )
        )

    if not candidates:
        raise ValueError("No valid clips with proper start and end timestamps could be parsed.")

    # Sort clips in descending order of virality score so best clip is first
    candidates.sort(key=lambda c: c.hook_score, reverse=True)

    return candidates
