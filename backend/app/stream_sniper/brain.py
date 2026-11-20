"""
AI Brain - Viral Clip Scout Engine
Reads timestamped transcript with (LOUD) and (CHAT) markers to select high-retention moments.
Supports Groq (0.5s ultra-fast), Gemini, OpenRouter, and OpenAI with automatic fallback.
"""
from __future__ import annotations

import json
import logging
import re
import urllib.request
import urllib.error
from typing import Any, Dict, List, Optional, Tuple

from . import config, games, roman

logger = logging.getLogger("stream_sniper.brain")

HEAD = """You are a clip scout for short-form gaming and streaming videos (YouTube Shorts, Reels, TikTok).
Below is a timestamped transcript of part of a video. Each line starts with [seconds]. Lines marked (LOUD)
are where the audio got much louder than usual: shouting, laughing, sudden action. Lines marked (CHAT)
are where the live chat suddenly got much busier, which usually means viewers reacted to something.

Video title: {title}
Channel: {uploader}

Pick up to {n} moments that would work as standalone clips for someone who has never seen the stream:
funny moments, fails, clutch plays, rage, shock, hot takes, or a short story with a payoff.
"""

LIVE_NOTE = """
This is a LIVE stream and the transcript is only the last few minutes, ending at {now:.0f} seconds.
If a moment is still unfolding at the very end, leave it out; you will see it again in the next check.
Most checks should return []. Only return a moment you would stop scrolling for.
"""

RULES = """
Rules:
- Each clip is {min_len} to {max_len} seconds. Use the [seconds] values for start and end.
- Start on the setup line, not mid-sentence. End right after the payoff or reaction, on the last word of a
  complete sentence: never in the middle of a sentence or a thought. The clip must make sense on its own.
- PRIORITIZE moments with (LOUD) or (CHAT) markers: screaming, hysterical laughter, hype reactions, rage, gunfights, or shocking fails!
- Do not pick intros, sponsor reads, "like and subscribe", or dead air.
- Skip weak moments. Fewer strong clips beat many weak ones. Return [] if nothing is worth clipping.
- score: 0-100, how likely a stranger keeps watching. Be honest; most clips are 60-95.
- hook: 3 to 6 words, ALL CAPS, shown as big text on the video. MUST be an irresistible curiosity hook (e.g. "HE BROKE HIS CONTROLLER!", "NO WAY HE SURVIVED THIS!", "POLICE CAUGHT HIM IN 4K!", "BRO LOST HIS MIND!"). STRICTLY FORBIDDEN to output 1-word hooks like "HE", "SHE", "IT", "LET", "WAIT", "LOOK", or "BRO".
- title: at most 70 characters, punchy title with emojis for YouTube Shorts.
- description: one or two sentences.
- hashtags: 5 tags without the # sign.
- highlight_words: 3 to 6 single words spoken in the clip that carry the punch.
- category: one of [funny, fail, clutch, rage, shock, take, story, other].
- reason: one short sentence on why it works.

Output strictly valid JSON with an array of clip objects with keys:
[{"start": float, "end": float, "score": int, "category": str, "hook": str, "title": str, "description": str, "hashtags": list[str], "highlight_words": list[str], "reason": str}]
No markdown codeblocks or extra conversation text.
"""

GAME_RULES = """
This stream is {game}. Pick the moments that only mean something with that game in mind:
- A play, a death, a jump scare, a glitch, a discovery, or the streamer reacting to one.
- The hook is what was said at that moment, or, if nothing was said, the name of what happened in
  two or three words ("1 VS 3", "THE SHOT", "HE GOT ME", "CLUTCH"). Never a sentence that needs
  the game explained.
- The title names the game when the clip is about it.
- The hashtags include {tags}.
"""

def build_transcript_text(words: List[Dict], loud_spikes: Optional[List[float]] = None, chat_spikes: Optional[List[float]] = None) -> str:
    """Builds timestamped transcript lines with (LOUD) and (CHAT) markers."""
    if not words:
        return ""
    lines = []
    cur_line = []
    cur_start = words[0]["s"]

    loud_set = set(int(t) for t in (loud_spikes or []))
    chat_set = set(int(t) for t in (chat_spikes or []))

    for w in words:
        cur_line.append(w["w"])
        if len(cur_line) >= 12 or w["w"].endswith((".", "!", "?")):
            sec_int = int(cur_start)
            flags = []
            if any(sec_int + dt in loud_set for dt in (-1, 0, 1)):
                flags.append("(LOUD)")
            if any(sec_int + dt in chat_set for dt in (-1, 0, 1)):
                flags.append("(CHAT)")
            flag_str = (" " + " ".join(flags)) if flags else ""
            lines.append(f"[{cur_start:.1f}s]{flag_str} {' '.join(cur_line)}")
            cur_line = []
            cur_start = w["e"]

    if cur_line:
        lines.append(f"[{cur_start:.1f}s] {' '.join(cur_line)}")

    return "\n".join(lines)


def _call_gemini(sys_prompt: str, user_prompt: str, api_key: str) -> List[Dict]:
    models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-exp", "gemini-1.5-pro"]
    payload = {
        "contents": [{"role": "user", "parts": [{"text": sys_prompt + "\n\n" + user_prompt}]}],
        "generationConfig": {"temperature": 0.35, "responseMimeType": "application/json", "thinkingConfig": {"thinkingBudget": 0}}
    }
    last_err = None
    for m in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={api_key}"
        try:
            req = urllib.request.Request(
                url, data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            raw = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                for k in ["clips", "moments", "data"]:
                    if k in parsed and isinstance(parsed[k], list):
                        return parsed[k]
                return [parsed] if "start" in parsed else []
            return parsed if isinstance(parsed, list) else []
        except urllib.error.HTTPError as he:
            last_err = he
            if he.code in (404, 503):
                continue
            raise he
        except Exception as e:
            last_err = e
            raise e
    if last_err:
        raise last_err
    return []


def test_api_key(provider: str, key: str) -> Tuple[bool, str]:
    """Tests if the given API key is valid by making a fast lightweight call."""
    key = str(key or "").strip()
    if not key:
        return False, "API key cannot be empty"

    p = provider.lower().strip()
    try:
        if p == "gemini":
            models_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"
            req = urllib.request.Request(
                models_url,
                headers={"User-Agent": "ViralClipAI/1.0"},
                method="GET"
            )
            try:
                with urllib.request.urlopen(req, timeout=10) as resp:
                    if resp.status == 200:
                        data = json.loads(resp.read().decode("utf-8"))
                        models = [m.get("name", "").replace("models/", "") for m in data.get("models", [])]
                        flash_m = next((m for m in ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-exp", "gemini-1.5-pro"] if m in models), "gemini-1.5-flash")
                        return True, f"Google Gemini ({flash_m}) Connected & Verified!"
            except urllib.error.HTTPError as he:
                err_msg = he.read().decode("utf-8", errors="ignore")
                try:
                    err_json = json.loads(err_msg)
                    return False, err_json.get("error", {}).get("message") or f"Gemini error {he.code}"
                except Exception:
                    return False, f"Gemini HTTP {he.code}: {err_msg[:120]}"
            except Exception as e:
                pass

            # Fallback direct generation test
            try:
                gen_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}"
                test_body = json.dumps({"contents": [{"parts": [{"text": "hi"}]}]}).encode("utf-8")
                req_gen = urllib.request.Request(gen_url, data=test_body, headers={"Content-Type": "application/json", "User-Agent": "ViralClipAI/1.0"}, method="POST")
                with urllib.request.urlopen(req_gen, timeout=10) as resp:
                    if resp.status == 200:
                        return True, "Google Gemini (gemini-1.5-flash) Connected & Verified!"
            except urllib.error.HTTPError as he:
                err_msg = he.read().decode("utf-8", errors="ignore")
                try:
                    err_json = json.loads(err_msg)
                    return False, err_json.get("error", {}).get("message") or f"Gemini error {he.code}"
                except Exception:
                    return False, f"Gemini HTTP {he.code}: {err_msg[:120]}"
            except Exception as e:
                return False, f"Gemini error: {e}"

        elif p == "groq":
            # First try listing models to verify key validity and discover active models
            try:
                models_url = "https://api.groq.com/openai/v1/models"
                req_models = urllib.request.Request(
                    models_url,
                    headers={"Authorization": f"Bearer {key}", "User-Agent": "ViralClipAI/1.0"},
                    method="GET"
                )
                with urllib.request.urlopen(req_models, timeout=8) as resp:
                    if resp.status == 200:
                        data = json.loads(resp.read().decode("utf-8"))
                        avail = [m.get("id") for m in data.get("data", [])]
                        preferred = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "llama-3.1-70b-versatile", "llama3-70b-8192", "llama3-8b-8192", "mixtral-8x7b-32768", "gemma2-9b-it"]
                        chosen = next((m for m in preferred if m in avail), avail[0] if avail else "llama-3.1-8b-instant")
                        return True, f"Groq ({chosen}) Connected & Verified!"
            except urllib.error.HTTPError as he:
                if he.code in (401, 403):
                    return False, "Invalid Groq API Key or Permission Denied"
            except Exception:
                pass

            # Fallback direct chat completion test across common models
            groq_models = ["llama-3.1-8b-instant", "llama3-8b-8192", "llama3-70b-8192", "llama-3.3-70b-versatile", "mixtral-8x7b-32768", "gemma2-9b-it"]
            last_err_msg = ""
            for m in groq_models:
                url = "https://api.groq.com/openai/v1/chat/completions"
                payload = {
                    "model": m,
                    "messages": [{"role": "user", "content": "hi"}],
                    "max_tokens": 5
                }
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={
                        "Authorization": f"Bearer {key}",
                        "Content-Type": "application/json",
                        "User-Agent": "ViralClipAI/1.0"
                    },
                    method="POST"
                )
                try:
                    with urllib.request.urlopen(req, timeout=8) as resp:
                        if resp.status == 200:
                            return True, f"Groq ({m}) Connected & Verified!"
                except urllib.error.HTTPError as he:
                    if he.code in (404, 400):
                        err_body = he.read().decode("utf-8", errors="ignore")
                        try:
                            j = json.loads(err_body)
                            last_err_msg = j.get("error", {}).get("message") or f"HTTP {he.code}"
                        except Exception:
                            last_err_msg = str(he)
                        continue
                    raise he
            if last_err_msg:
                return False, last_err_msg

        elif p == "openai":
            url = "https://api.openai.com/v1/chat/completions"
            payload = {
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": "hi"}],
                "max_tokens": 5
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                    "User-Agent": "ViralClipAI/1.0"
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status == 200:
                    return True, "OpenAI (GPT-4o mini) Connected & Verified!"

        elif p == "openrouter":
            # Test via official OpenRouter key inspection endpoint
            auth_url = "https://openrouter.ai/api/v1/auth/key"
            req = urllib.request.Request(
                auth_url,
                headers={
                    "Authorization": f"Bearer {key}",
                    "User-Agent": "ViralClipAI/1.0"
                },
                method="GET"
            )
            try:
                with urllib.request.urlopen(req, timeout=10) as resp:
                    if resp.status == 200:
                        data = json.loads(resp.read().decode("utf-8"))
                        key_data = data.get("data", {})
                        label = key_data.get("label") or "Active"
                        limit = key_data.get("limit")
                        limit_str = f"Limit: ${limit}" if limit else "Connected"
                        return True, f"OpenRouter ({label} • {limit_str}) Verified!"
            except urllib.error.HTTPError as he:
                if he.code in (401, 403):
                    return False, "Invalid OpenRouter API Key"
                err_body = he.read().decode("utf-8", errors="ignore")
                try:
                    j = json.loads(err_body)
                    return False, j.get("error", {}).get("message") or f"OpenRouter HTTP {he.code}"
                except Exception:
                    return False, f"OpenRouter HTTP {he.code}: {err_body[:100]}"
        else:
            return False, f"Unknown AI provider: {provider}"

    except urllib.error.HTTPError as he:
        err_body = he.read().decode("utf-8", errors="ignore")
        try:
            j = json.loads(err_body)
            msg = j.get("error", {}).get("message") or j.get("message") or f"HTTP {he.code}"
            return False, msg
        except Exception:
            return False, f"HTTP {he.code}: {err_body[:100]}"
    except Exception as e:
        return False, str(e)

    return False, "Failed to verify key with provider."


def generate_chunk_clips_json(prompt: str) -> Optional[str]:
    """Sends chunk prompt to the first working configured AI provider and returns raw response string."""
    keys = config.get_api_keys()
    order = []
    for p in ["gemini", "groq", "openai", "openrouter"]:
        if keys.get(p) and keys[p].strip():
            order.append(p)

    if not order:
        logger.warning("No AI API keys configured for automatic chunk processing.")
        return None

    for provider in order:
        key = keys[provider].strip()
        try:
            if provider == "gemini":
                for m in ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-exp", "gemini-1.5-pro"]:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={key}"
                    payload = {
                        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.3, "responseMimeType": "application/json"}
                    }
                    try:
                        req = urllib.request.Request(
                            url,
                            data=json.dumps(payload).encode("utf-8"),
                            headers={"Content-Type": "application/json", "User-Agent": "ViralClipAI/1.0"},
                            method="POST"
                        )
                        with urllib.request.urlopen(req, timeout=35) as resp:
                            data = json.loads(resp.read().decode("utf-8"))
                        text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                        if text:
                            logger.info(f"Generated clips JSON via Gemini ({m})")
                            return text
                    except urllib.error.HTTPError as he:
                        if he.code in (404, 503):
                            continue
                        raise he

            elif provider == "groq":
                url = "https://api.groq.com/openai/v1/chat/completions"
                for model in ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "llama-3.1-70b-versatile", "llama3-70b-8192", "llama3-8b-8192", "mixtral-8x7b-32768"]:
                    payload = {
                        "model": model,
                        "messages": [
                            {"role": "system", "content": "You are a professional viral short-form video scout. Always output strictly a valid JSON array."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.3,
                        "response_format": {"type": "json_object"}
                    }
                    try:
                        req = urllib.request.Request(
                            url,
                            data=json.dumps(payload).encode("utf-8"),
                            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json", "User-Agent": "ViralClipAI/1.0"},
                            method="POST"
                        )
                        with urllib.request.urlopen(req, timeout=35) as resp:
                            data = json.loads(resp.read().decode("utf-8"))
                        text = data["choices"][0]["message"]["content"].strip()
                        if text:
                            logger.info(f"Generated clips JSON via Groq ({model})")
                            return text
                    except urllib.error.HTTPError as he:
                        if he.code in (404, 400):
                            continue
                        raise he

            elif provider == "openai":
                url = "https://api.openai.com/v1/chat/completions"
                payload = {
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": "You are a professional viral short-form video scout. Always output strictly a valid JSON array."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.3,
                    "response_format": {"type": "json_object"}
                }
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json", "User-Agent": "ViralClipAI/1.0"},
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=35) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                text = data["choices"][0]["message"]["content"].strip()
                if text:
                    logger.info("Generated clips JSON via OpenAI (gpt-4o-mini)")
                    return text

            elif provider == "openrouter":
                url = "https://openrouter.ai/api/v1/chat/completions"
                for model in [
                    "meta-llama/llama-3.3-70b-instruct",
                    "google/gemini-2.0-flash-001",
                    "google/gemini-flash-1.5",
                    "meta-llama/llama-3.1-8b-instruct",
                    "qwen/qwen-2.5-coder-32b-instruct",
                    "meta-llama/llama-3.3-70b-instruct:free",
                    "meta-llama/llama-3.1-8b-instruct:free"
                ]:
                    payload = {
                        "model": model,
                        "messages": [
                            {"role": "system", "content": "You are a professional viral short-form video scout. Always output strictly a valid JSON array."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.3
                    }
                    try:
                        req = urllib.request.Request(
                            url,
                            data=json.dumps(payload).encode("utf-8"),
                            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json", "User-Agent": "ViralClipAI/1.0"},
                            method="POST"
                        )
                        with urllib.request.urlopen(req, timeout=35) as resp:
                            data = json.loads(resp.read().decode("utf-8"))
                        text = data["choices"][0]["message"]["content"].strip()
                        if text:
                            logger.info(f"Generated clips JSON via OpenRouter ({model})")
                            return text
                    except urllib.error.HTTPError as he:
                        if he.code in (404, 400):
                            continue
                        raise he

        except Exception as e:
            logger.warning(f"Error querying provider {provider}: {e}")
            continue

    return None


def _call_openai_compatible(endpoint: str, sys_prompt: str, user_prompt: str, api_key: str, models: List[str]) -> List[Dict]:
    last_err = None
    for model_name in models:
        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.35,
            "response_format": {"type": "json_object"}
        }
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        try:
            req = urllib.request.Request(endpoint, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            content = data["choices"][0]["message"]["content"].strip()
            parsed = json.loads(content)
            if isinstance(parsed, dict):
                for k in ["clips", "moments", "data", "results"]:
                    if k in parsed and isinstance(parsed[k], list):
                        return parsed[k]
                if "start" in parsed and "end" in parsed:
                    return [parsed]
                return []
            return parsed if isinstance(parsed, list) else []
        except urllib.error.HTTPError as he:
            last_err = he
            if he.code in (404, 400):
                continue
            raise he
        except Exception as e:
            last_err = e
            raise e
    if last_err:
        raise last_err
    return []


def select_clips(
    transcript: str,
    title: str,
    uploader: str,
    game: str,
    api_keys: Dict[str, str],
    is_live: bool = False,
    now_sec: float = 0.0,
    min_len: int = 20,
    max_len: int = 55,
    min_score: int = 70,
    n_clips: int = 6,
    primary_ai: str = "groq"
) -> Tuple[List[Dict], str, List[str]]:
    """
    AI Brain Selection with Multi-AI Fallback.
    Returns: (clips, used_provider, logs)
    """
    logs = []
    game_name, game_tags = games.detect(title, game)
    game_part = ""
    if game_name:
        game_part = GAME_RULES.format(game=game_name, tags=", ".join(game_tags[:5]))

    live_part = LIVE_NOTE.format(now=now_sec) if is_live else ""
    sys_prompt = HEAD.format(title=title, uploader=uploader, n=n_clips) + game_part + live_part + RULES.format(min_len=min_len, max_len=max_len)
    user_prompt = f"<transcript>\n{transcript}\n</transcript>"

    order = [primary_ai]
    for p in ["groq", "gemini", "openrouter", "openai"]:
        if p not in order and api_keys.get(p) and api_keys[p].strip():
            order.append(p)

    for provider in order:
        key = (api_keys.get(provider) or "").strip()
        if not key:
            continue
        logs.append(f"Brain evaluating with {provider.upper()}...")
        try:
            raw_clips = []
            if provider == "groq":
                raw_clips = _call_openai_compatible(
                    "https://api.groq.com/openai/v1/chat/completions",
                    sys_prompt, user_prompt, key,
                    ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "llama-3.3-70b-versatile"]
                )
            elif provider == "gemini":
                raw_clips = _call_gemini(sys_prompt, user_prompt, key)
            elif provider == "openrouter":
                raw_clips = _call_openai_compatible(
                    "https://openrouter.ai/api/v1/chat/completions",
                    sys_prompt, user_prompt, key,
                    ["nvidia/nemotron-3.5-lightning:free", "inclusionai/ling-3.2-flash:free", "particle-ai/particle-1:free"]
                )
            elif provider == "openai":
                raw_clips = _call_openai_compatible(
                    "https://api.openai.com/v1/chat/completions",
                    sys_prompt, user_prompt, key,
                    ["gpt-4o-mini", "gpt-3.5-turbo"]
                )

            valid = []
            for c in raw_clips:
                if not isinstance(c, dict):
                    continue
                start = float(c.get("start", 0))
                end = float(c.get("end", 0))
                score = int(c.get("score", 70))
                dur = end - start
                if dur >= min_len - 3 and dur <= max_len + 5 and score >= min_score:
                    c["start"] = round(start, 2)
                    c["end"] = round(end, 2)
                    c["score"] = score
                    c["hook"] = str(c.get("hook") or "VIRAL MOMENT").upper()[:40]
                    c["title"] = str(c.get("title") or title)[:70]
                    c["description"] = str(c.get("description") or "")[:200]
                    c["hashtags"] = c.get("hashtags") or (game_tags[:5] if game_tags else ["gaming", "shorts"])
                    c["highlight_words"] = c.get("highlight_words") or []
                    c["category"] = str(c.get("category") or "other").lower()
                    c["reason"] = str(c.get("reason") or "Peak engagement moment")[:200]
                    valid.append(c)

            if valid:
                logs.append(f"{provider.upper()} returned {len(valid)} viral moments")
                return valid, provider, logs

        except Exception as e:
            logs.append(f"{provider.upper()} error: {str(e)[:100]}. Auto-fallback triggered.")
            logger.warning(f"Brain provider {provider} failed: {e}")

    # Heuristic fallback from transcript lines
    logs.append("Triggering smart heuristic transcript fallback...")
    fallback_clips = _heuristic_clips(transcript, title, min_len, max_len, game_tags)
    return fallback_clips, "heuristic_pulse", logs


def _heuristic_clips(transcript: str, title: str, min_len: int, max_len: int, game_tags: List[str]) -> List[Dict]:
    lines = []
    for line in transcript.split("\n"):
        m = re.match(r"\[([\d\.]+)s\](?:\s*\((?:LOUD|CHAT)\))*\s*(.*)", line.strip())
        if m:
            lines.append((float(m.group(1)), m.group(2).strip(), "(LOUD)" in line or "(CHAT)" in line))
    if not lines:
        return []
    clips = []
    i = 0
    while i < len(lines):
        start_t, text_acc, is_hot = lines[i]
        curr_text = [text_acc]
        end_t = start_t + 10.0
        j = i + 1
        while j < len(lines) and (lines[j][0] - start_t) <= max_len:
            end_t = lines[j][0] + 5.0
            curr_text.append(lines[j][1])
            if lines[j][2]:
                is_hot = True
            j += 1
        dur = end_t - start_t
        if dur >= min_len:
            words = [w for w in " ".join(curr_text).split() if len(w) > 3]
            hook = " ".join(words[:4]).upper() if words else "STREAM HIGHLIGHT"
            clips.append({
                "start": round(start_t, 2),
                "end": round(end_t, 2),
                "score": 90 if is_hot else 80,
                "hook": hook[:35],
                "title": f"{title[:40]} Highlight #{len(clips)+1}",
                "description": f"Highlight moment from {title}",
                "hashtags": game_tags[:5] if game_tags else ["gaming", "shorts"],
                "highlight_words": words[:4],
                "category": "clutch" if is_hot else "funny",
                "reason": "High volume energy & viewer reaction spike"
            })
            i = j
        else:
            i += 1
        if len(clips) >= 10:
            break
    return clips
