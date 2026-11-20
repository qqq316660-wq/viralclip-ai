"""PeakCut vertical render engine: 9:16 layout, bouncy word captions, hook pill box, facecam PIP overlay."""
import os
import re
import shutil
import struct
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

from . import config, roman

W, H = config.OUT_W, config.OUT_H

def _bgr(rgb_hex: str) -> str:
    """Convert RGB hex (RRGGBB) to ASS color (BBGGRR)."""
    h = str(rgb_hex).lstrip('#').upper()
    if len(h) == 6:
        r, g, b = h[0:2], h[2:4], h[4:6]
        return f"{b}{g}{r}"
    return h

STYLES = {
    "bounce": {
        "label": "Bounce",
        "font": "Poppins ExtraBold",
        "size": 126,
        "base": _bgr("FFFFFF"),          # White (FFFFFF)
        "active": _bgr("00F0FF"),        # Vibrant Electric Cyan (FFF000)
        "strong": _bgr("FFFFFF"),
        "outline": 8,
        "pop": 115,
        "upper": True,
        "per": 3,
        "hook_box": _bgr("00F0FF"),      # Cyan pill
        "hook_ink": _bgr("000000")       # Black text
    },
    "karaoke": {
        "label": "Karaoke",
        "font": "Anton",
        "size": 136,
        "base": _bgr("FFFFFF"),          # White (FFFFFF)
        "active": _bgr("FFE600"),        # Punchy Yellow Highlight (00E6FF)
        "strong": _bgr("FFFFFF"),
        "outline": 9,
        "pop": 112,
        "upper": True,
        "per": 3,
        "hook_box": _bgr("FFE600"),      # Yellow pill
        "hook_ink": _bgr("000000")       # Black text
    },
    "clean": {
        "label": "Clean",
        "font": "Poppins ExtraBold",
        "size": 95,
        "base": _bgr("D0D0D0"),          # Soft light gray
        "active": _bgr("FFFFFF"),        # Crisp Pure White
        "strong": _bgr("FFFFFF"),
        "outline": 4,
        "pop": 105,
        "upper": False,
        "per": 4,
        "hook_box": _bgr("222222"),      # Dark minimalist pill
        "hook_ink": _bgr("E0E0E0")       # Off-white text
    },
    # Backwards compatibility alias
    "hype": {
        "label": "Hype",
        "font": "Anton",
        "size": 136,
        "base": _bgr("FFFFFF"),
        "active": _bgr("FFE600"),
        "strong": _bgr("FFFFFF"),
        "outline": 9,
        "pop": 112,
        "upper": True,
        "per": 3,
        "hook_box": _bgr("FFE600"),
        "hook_ink": _bgr("000000")
    }
}

HOOK = {
    "font": "Poppins ExtraBold", "size": 96, "ink": "14100E", "box": "FFFFFF",
    "pad_x": 36, "pad_y": 22, "radius": 26, "max_w": 900
}

FONT_FILES = {
    "Poppins ExtraBold": "Poppins-ExtraBold.ttf",
    "Anton": "Anton-Regular.ttf",
    "Archivo Black": "ArchivoBlack-Regular.ttf"
}

CAP_MAX_W = 960
NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)
_qsv_ok = None
RENDER_SECONDS = 600

PIP_W = 380
PIP_MARGIN = 26


class _Font:
    _cache = {}

    def __init__(self, name: str):
        fname = FONT_FILES.get(name, FONT_FILES["Poppins ExtraBold"])
        path = config.FONTS_DIR / fname
        if not path.exists():
            # Check clipkut fallback
            clipkut_font = Path(r"D:\clipkut\data\fonts") / fname
            if clipkut_font.exists():
                shutil.copyfile(clipkut_font, path)

        d = path.read_bytes()
        tables = {}
        for i in range(struct.unpack(">H", d[4:6])[0]):
            tag, _, off, _ = struct.unpack(">4sIII", d[12 + 16 * i: 28 + 16 * i])
            tables[tag] = off
        self.upm = struct.unpack(">H", d[tables[b"head"] + 18: tables[b"head"] + 20])[0]
        o = tables[b"OS/2"]
        self.asc, self.desc = struct.unpack(">HH", d[o + 74: o + 78])
        self.cap = struct.unpack(">h", d[o + 88: o + 90])[0] or int(self.upm * 0.7)
        self.path = str(path)
        self._pil = {}

    @classmethod
    def get(cls, name: str):
        if name not in cls._cache:
            cls._cache[name] = cls(name)
        return cls._cache[name]

    def em(self, size: float) -> float:
        return size * self.upm / (self.asc + self.desc)

    def width(self, text: str, size: float) -> float:
        try:
            from PIL import ImageFont
            if "f" not in self._pil:
                self._pil["f"] = ImageFont.truetype(self.path, 200)
            return self._pil["f"].getlength(text) * self.em(size) / 200
        except Exception:
            return len(text) * self.em(size) * 0.62

    def cap_shift(self, size: float) -> float:
        return ((self.asc - self.desc) / 2 - self.cap / 2) * size / (self.asc + self.desc)


def _ts(t: float) -> str:
    t = max(0.0, t)
    h, m = int(t // 3600), int(t % 3600 // 60)
    return f"{h}:{m:02d}:{t % 60:05.2f}"


def _clean(text: str) -> str:
    return re.sub(r"[\x00-\x1f\x7f]+", " ", re.sub(r"[{}\\]", "", str(text))).strip()


def _key(word: str) -> str:
    return re.sub(r"[^a-z0-9']", "", word.lower())


def _groups(words: list, per: int) -> list:
    out, cur = [], []
    for w in words:
        if cur and (len(cur) >= per or sum(len(x["w"]) for x in cur) + len(w["w"]) > 16
                    or w["s"] - cur[-1]["e"] > 0.45 or cur[-1]["w"][-1:] in ".?!"):
            out.append(cur)
            cur = []
        cur.append(w)
    if cur:
        out.append(cur)
    return out


def geometry(src_w: int, src_h: int, layout: str, custom_hook_y: float = None, custom_cap_y: float = None, split_pct: int = 35):
    if layout == "splitscreen":
        pct = split_pct if split_pct is not None else 35
        top_h = int(round((H * pct) / 100.0 / 2.0)) * 2
        bot_h = H - top_h
        hook_y = float(custom_hook_y) if custom_hook_y is not None else float(top_h)
        cap_y = float(custom_cap_y) if custom_cap_y is not None else float(round(H * 0.90))
        return layout, H, hook_y, cap_y

    if src_h >= src_w and layout not in ("crop", "splitscreen"):
        layout = "crop"
    if layout == "blur":
        fg_h = min(H, int(round(W * src_h / src_w / 2)) * 2)
    elif layout == "zoom":
        fg_h = 1000
    else:
        fg_h = H
    top = (H - fg_h) // 2
    if layout in ("crop", "gameplay"):
        hook_y = float(custom_hook_y) if custom_hook_y is not None else 300.0
        cap_y = float(custom_cap_y) if custom_cap_y is not None else 1380.0
        return layout, fg_h, hook_y, cap_y
    hook_y = float(custom_hook_y) if custom_hook_y is not None else max(230.0, float(top - 190))
    cap_y = float(custom_cap_y) if custom_cap_y is not None else min(1640.0, float(top + fg_h + 180))
    return layout, fg_h, hook_y, cap_y


def _hook_events(hook: str, dur: float, y: float, st: dict = None) -> list:
    if not hook or not hook.strip():
        return []
    box_color = HOOK["box"]
    ink_color = HOOK["ink"]
    f, size = _Font.get(HOOK["font"]), HOOK["size"]
    words = hook.split()
    if not words:
        return []
    lines = [" ".join(words)]
    if f.width(lines[0], size) > HOOK["max_w"] and len(words) > 1:
        cut = min(range(1, len(words)), key=lambda i: max(f.width(" ".join(words[:i]), size), f.width(" ".join(words[i:]), size)))
        lines = [" ".join(words[:cut]), " ".join(words[cut:])]
    widest = max(f.width(l, size) for l in lines)
    if widest > HOOK["max_w"]:
        size = max(40, int(size * HOOK["max_w"] / widest))
        widest = max(f.width(l, size) for l in lines)
    line_h = f.em(size) * 1.16
    bw, bh = widest + 2 * HOOK["pad_x"], line_h * len(lines) + 2 * HOOK["pad_y"]
    x0, y0, r = (W - bw) / 2, y - bh / 2, min(HOOK["radius"], bh / 2)
    x1, y1 = x0 + bw, y0 + bh
    n = lambda v: f"{v:.0f}"
    box = (f"m {n(x0 + r)} {n(y0)} l {n(x1 - r)} {n(y0)} b {n(x1)} {n(y0)} {n(x1)} {n(y0)} {n(x1)} {n(y0 + r)} "
           f"l {n(x1)} {n(y1 - r)} b {n(x1)} {n(y1)} {n(x1)} {n(y1)} {n(x1 - r)} {n(y1)} "
           f"l {n(x0 + r)} {n(y1)} b {n(x0)} {n(y1)} {n(x0)} {n(y1)} {n(x0)} {n(y1 - r)} "
           f"l {n(x0)} {n(y0 + r)} b {n(x0)} {n(y0)} {n(x0)} {n(y0)} {n(x0 + r)} {n(y0)}")
    span = f"{_ts(0)},{_ts(dur)}"
    ev = [f"Dialogue: 3,{span},Hook,,0,0,0,,{{\\an7\\pos(0,0)\\fad(160,0)\\c&H{box_color}&\\p1}}{box}{{\\p0}}"]
    for i, line in enumerate(lines):
        cy = y - line_h * (len(lines) - 1) / 2 + i * line_h - f.cap_shift(size)
        ev.append(f"Dialogue: 4,{span},Hook,,0,0,0,,{{\\an5\\pos({W // 2},{cy:.0f})\\fad(160,0)\\fs{size}\\c&H{ink_color}&}}{line}")
    return ev


def build_ass(words: list, start: float, end: float, hook: str, style_name: str, highlight: list, hook_y: float, cap_y: float) -> str:
    st = STYLES.get(style_name, STYLES["bounce"])
    strong = {_key(h) for h in highlight if _key(h)}
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,{st['font']},{st['size']},&H00{st['base']},&H00{st['base']},&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,{st['outline']},0,5,0,0,0,1
Style: Hook,{HOOK['font']},{HOOK['size']},&H00{HOOK['ink']},&H00{HOOK['ink']},&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,0,0,5,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    dur = max(0.1, end - start)
    ev = _hook_events(_clean(hook), dur, hook_y, st)
    f = _Font.get(st["font"])
    inside = [dict(w, w=_clean(w["w"])) for w in words if w["s"] >= start - 0.05 and w["s"] < end]
    inside = sorted((w for w in inside if w["w"]), key=lambda w: w["s"])
    for i, w in enumerate(inside[:-1]):
        w["e"] = max(w["s"], min(w["e"], inside[i + 1]["s"]))
    groups = _groups(inside, st["per"])
    for gi, g in enumerate(groups):
        g_start = max(0.0, g[0]["s"] - start)
        g_end = min(g[-1]["e"] + 0.25, groups[gi + 1][0]["s"] if gi + 1 < len(groups) else end) - start
        if g_end - g_start < 0.02:
            continue
        texts = []
        for x in g:
            t = re.sub(r"[.,;:]+$", "", x["w"])
            texts.append(t.upper() if st["upper"] else t)
        if not all(roman.drawable(t) for t in texts):
            line = " ".join(texts)
            fs = max(44, min(int(st["size"] * 0.7), int(1500 / max(1, len(line)) * 1.6)))
            ev.append(f"Dialogue: 1,{_ts(g_start)},{_ts(g_end)},Cap,,60,60,0,,{{\\an5\\pos({W // 2},{cap_y:.0f})\\q0\\fs{fs}}}{line}")
            continue
        size = st["size"]
        gap = f.width("n n", size) - 2 * f.width("n", size) + (2 * st["outline"] + 6) * size / st["size"]
        total = sum(f.width(t, size) for t in texts) + gap * (len(texts) - 1)
        if total > CAP_MAX_W:
            size = max(36, int(size * CAP_MAX_W / total))
            gap = f.width("n n", size) - 2 * f.width("n", size) + (2 * st["outline"] + 6) * size / st["size"]
            total = sum(f.width(t, size) for t in texts) + gap * (len(texts) - 1)
        cy = cap_y - f.cap_shift(size)
        x = (W - total) / 2
        for i, (w, t) in enumerate(zip(g, texts)):
            wd = f.width(t, size)
            p = max(104, min(st["pop"], 100 + int(2200 / max(wd, 1))))
            pos = f"\\an5\\pos({x + wd / 2:.0f},{cy:.0f})\\fs{size}"
            x += wd + gap
            a = max(g_start, w["s"] - start)
            b = (g[i + 1]["s"] - start) if i + 1 < len(g) else g_end
            base = st["strong"] if _key(w["w"]) in strong else st["base"]
            if a - g_start >= 0.02:
                ev.append(f"Dialogue: 1,{_ts(g_start)},{_ts(a)},Cap,,0,0,0,,{{{pos}\\c&H{base}&}}{t}")
            if b - a >= 0.02:
                ev.append(f"Dialogue: 2,{_ts(a)},{_ts(b)},Cap,,0,0,0,,{{{pos}\\c&H{st['active']}&\\fscx94\\fscy94"
                          f"\\t(0,90,\\fscx{p}\\fscy{p})\\t(90,200,\\fscx{p - 5}\\fscy{p - 5})}}{t}")
            if g_end - b >= 0.02:
                ev.append(f"Dialogue: 1,{_ts(b)},{_ts(g_end)},Cap,,0,0,0,,{{{pos}\\c&H{base}&\\fscx{p - 5}\\fscy{p - 5}"
                          f"\\t(0,90,\\fscx100\\fscy100)}}{t}")
    return head + "\n".join(ev) + "\n"


def _filter(layout: str, fg_h: int, facecam=None, gameplay=None, split_pct: int = 45, src_w: int = 1920, src_h: int = 1080) -> str:
    if layout == "splitscreen":
        top_h = int(round((H * (split_pct or 45)) / 100.0 / 2.0)) * 2
        bot_h = H - top_h

        # Scale coordinates cleanly whether passed as fraction (0..1), percentage (0..100), or pixels
        def _parse_box(box, default_box):
            if not box or not isinstance(box, (list, tuple, dict)):
                b = default_box
            elif isinstance(box, dict):
                b = [box.get("x", 0), box.get("y", 0), box.get("w", 1), box.get("h", 1)]
            elif len(box) == 4:
                b = list(box)
            else:
                b = default_box

            x, y, w, h = float(b[0]), float(b[1]), float(b[2]), float(b[3])
            if w <= 1.05 and h <= 1.05 and x <= 1.05 and y <= 1.05:
                # 0..1 fraction
                px = int(round(x * src_w))
                py = int(round(y * src_h))
                pw = int(round(w * src_w))
                ph = int(round(h * src_h))
            elif w <= 100.0 and h <= 100.0:
                # 0..100 percentage
                px = int(round((x / 100.0) * src_w))
                py = int(round((y / 100.0) * src_h))
                pw = int(round((w / 100.0) * src_w))
                ph = int(round((h / 100.0) * src_h))
            else:
                # 1920x1080 pixel canvas
                scale_x = src_w / 1920.0
                scale_y = src_h / 1080.0
                px = int(round(x * scale_x))
                py = int(round(y * scale_y))
                pw = int(round(w * scale_x))
                ph = int(round(h * scale_y))

            px = max(0, min(px, src_w - 32))
            py = max(0, min(py, src_h - 32))
            pw = max(32, min(pw, src_w - px))
            ph = max(32, min(ph, src_h - py))
            return (px // 2) * 2, (py // 2) * 2, (pw // 2) * 2, (ph // 2) * 2

        # Facecam crop box (default: left streamer cam)
        fx, fy, fw, fh = _parse_box(facecam, [0.0, 0.36, 0.23, 0.28])
        # Gameplay crop box (default: centered 1:1 gameplay)
        gx, gy, gw, gh = _parse_box(gameplay, [0.219, 0.0, 0.5625, 1.0])

        return (
            f"[0:v]fps={config.OUT_FPS},split=2[fc_raw][gp_raw];"
            f"[fc_raw]crop={fw}:{fh}:{fx}:{fy},scale={W}:{top_h}:flags=lanczos:force_original_aspect_ratio=increase,crop={W}:{top_h}:(in_w-out_w)/2:(in_h-out_h)/2,setsar=1[top];"
            f"[gp_raw]crop={gw}:{gh}:{gx}:{gy},scale={W}:{bot_h}:flags=lanczos:force_original_aspect_ratio=increase,crop={W}:{bot_h}:(in_w-out_w)/2:(in_h-out_h)/2,setsar=1[bot];"
            f"[top][bot]vstack=inputs=2[v0];"
        )

    if layout == "gameplay" and facecam and len(facecam) == 4:
        fx, fy, fw, fh = (int(v) for v in facecam)
        if fw > 8 and fh > 8:
            pip_h = max(2, int(round(PIP_W * fh / fw)))
            return (f"[0:v]fps={config.OUT_FPS},split=2[base][fc];"
                    f"[base]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1[b];"
                    f"[fc]crop={fw}:{fh}:{fx}:{fy},scale={PIP_W}:{pip_h},setsar=1[p];"
                    f"[b][p]overlay={W - PIP_W - PIP_MARGIN}:{PIP_MARGIN}[v0];")
    if layout == "crop" or (layout == "gameplay" and not facecam):
        return f"[0:v]fps={config.OUT_FPS},scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1[v0];"
    return (f"[0:v]fps={config.OUT_FPS},split=2[a][b];"
            f"[a]scale=270:480:force_original_aspect_ratio=increase,crop=270:480,boxblur=6:2,"
            f"scale={W}:{H},eq=brightness=-0.14:saturation=1.15[bg];"
            f"[b]scale={W}:{fg_h}:force_original_aspect_ratio=increase,crop={W}:{fg_h}[fg];"
            f"[bg][fg]overlay=0:(H-h)/2,setsar=1[v0];")


def _hook_y(layout: str, hook_y: float, facecam=None) -> float:
    if layout == "splitscreen":
        return hook_y
    if layout == "gameplay" and facecam and len(facecam) == 4 and facecam[2] > 8:
        return PIP_MARGIN + int(round(PIP_W * facecam[3] / facecam[2])) + 32
    return hook_y


def make_banner_overlay_png(text: str, out_png: Path, max_w: int = 960):
    """Draws a premium rounded-pill headline badge with native FULL-COLOR EMOJIS using Pillow."""
    try:
        from PIL import Image, ImageDraw, ImageFont
        text = (text or "").strip()
        if not text:
            return None

        font_path = "C:/Windows/Fonts/seguiemj.ttf"
        if not Path(font_path).exists():
            font_path = "C:/Windows/Fonts/seguibl.ttf"

        font_size = 44
        try:
            font = ImageFont.truetype(font_path, size=font_size)
        except Exception:
            font = ImageFont.load_default()

        dummy = Image.new("RGBA", (1, 1))
        draw_d = ImageDraw.Draw(dummy)
        words = text.split()
        lines = [" ".join(words)]
        bbox0 = draw_d.textbbox((0, 0), lines[0], font=font)
        if (bbox0[2] - bbox0[0]) > max_w and len(words) > 2:
            cut = len(words) // 2
            lines = [" ".join(words[:cut]), " ".join(words[cut:])]

        line_w = [draw_d.textbbox((0, 0), l, font=font)[2] - draw_d.textbbox((0, 0), l, font=font)[0] for l in lines]
        widest = max(line_w) if line_w else 100
        line_h = int(font_size * 1.25)
        pad_x, pad_y = 32, 16
        bw = widest + pad_x * 2
        bh = line_h * len(lines) + pad_y * 2
        bw = (bw // 2) * 2
        bh = (bh // 2) * 2

        im = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
        draw = ImageDraw.Draw(im)

        # Pill background with rounded edges
        draw.rounded_rectangle([0, 0, bw, bh], radius=min(bh // 2, 28), fill=(255, 255, 255, 248))

        for idx, l in enumerate(lines):
            lw = line_w[idx]
            lx = (bw - lw) // 2
            ly = pad_y + idx * line_h - 4
            try:
                draw.text((lx, ly), l, font=font, fill=(10, 10, 10, 255), embedded_color=True)
            except Exception:
                draw.text((lx, ly), l, font=font, fill=(10, 10, 10, 255))

        im.save(out_png, "PNG")
        return bw, bh
    except Exception as be:
        return None


def render_clip(src: Path, out_dir: Path, name: str, clip: dict, words: list, src_w: int, src_h: int) -> dict:
    """Renders <name>.mp4, <name>.jpg and <name>.ass into out_dir. Returns file metadata."""
    out_dir.mkdir(parents=True, exist_ok=True)
    start, end = float(clip["start"]), float(clip["end"])
    layout = clip.get("layout", "gameplay")
    custom_hook_y = clip.get("hook_y")
    custom_cap_y = clip.get("cap_y")
    split_pct = int(clip.get("split_pct", 45))
    layout, fg_h, hook_y, cap_y = geometry(src_w, src_h, layout, custom_hook_y, custom_cap_y, split_pct)
    face = clip.get("facecam")
    gameplay = clip.get("gameplay")
    if layout == "gameplay" and not (face and len(face) == 4):
        layout = "crop"
    hook_y = _hook_y(layout, hook_y, face)
    banner_headline = clip.get("headline") or clip.get("suggested_headline") or clip.get("hook", "")
    if banner_headline:
        # Strip creator name prefix if present (e.g. "SteveTheGamer55 Reacts to..." -> "Reacts to...")
        uploader = str(clip.get("uploader") or "")
        if uploader and uploader.strip():
            u = uploader.strip()
            banner_headline = re.sub(rf"^{re.escape(u)}('s)?\s*[:-]?\s*", "", banner_headline, flags=re.IGNORECASE).strip()
        banner_headline = re.sub(r"^(Streamer|Creator)('s)?\s*[:-]?\s*", "", banner_headline, flags=re.IGNORECASE).strip()

    work = Path(tempfile.mkdtemp(prefix="pk_render_"))
    banner_png = work / "banner.png"
    banner_dims = make_banner_overlay_png(banner_headline, banner_png)

    # Don't duplicate hook in ASS subtitles if image overlay was created
    hook_for_ass = "" if banner_dims else banner_headline
    ass = build_ass(
        words if clip.get("captions", True) else [],
        start, end, hook_for_ass, clip.get("style", "bounce"),
        clip.get("highlight_words", []), hook_y, cap_y
    )
    try:
        return _render_in(
            work, src, out_dir, name, start, end, layout, fg_h, ass,
            face=face, gameplay=gameplay, split_pct=split_pct, src_w=src_w, src_h=src_h,
            banner_png=banner_png if banner_dims else None, hook_y=hook_y
        )
    finally:
        shutil.rmtree(work, ignore_errors=True)


def _render_in(work: Path, src: Path, out_dir: Path, name: str, start: float, end: float, layout: str, fg_h: int, ass: str, face=None, gameplay=None, split_pct: int = 45, src_w: int = 1920, src_h: int = 1080, banner_png: Path = None, hook_y: float = 800.0) -> dict:
    global _qsv_ok
    (work / f"{name}.ass").write_text(ass, encoding="utf-8")
    (work / "f").mkdir(exist_ok=True)
    for f in config.FONTS_DIR.glob("*.ttf"):
        shutil.copyfile(f, work / "f" / f.name)

    if banner_png and banner_png.exists():
        inputs = ["-i", str(src), "-i", str(banner_png)]
        fc = _filter(layout, fg_h, facecam=face, gameplay=gameplay, split_pct=split_pct, src_w=src_w, src_h=src_h)
        fc += f"[v0]ass={name}.ass:fontsdir=f[v_sub];"
        fc += f"[v_sub][1:v]overlay=(W-w)/2:{int(round(hook_y))}-h/2[v]"
    else:
        inputs = ["-i", str(src)]
        fc = _filter(layout, fg_h, facecam=face, gameplay=gameplay, split_pct=split_pct, src_w=src_w, src_h=src_h) + f"[v0]ass={name}.ass:fontsdir=f[v]"

    base = [
        "ffmpeg", "-y", "-v", "error", "-ss", f"{start:.2f}", "-t", f"{end - start:.2f}"
    ] + inputs + [
        "-filter_complex", fc, "-map", "[v]", "-map", "0:a:0", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", "-pix_fmt"
    ]
    encoders = []
    if _qsv_ok is True:
        encoders.append(("qsv", ["nv12", "-c:v", "h264_qsv", "-global_quality", "20", "-preset", "veryfast"]))
    encoders.append(("x264", ["yuv420p", "-c:v", "libx264", "-crf", "20", "-preset", "veryfast", "-threads", "4"]))
    err = None
    for label, enc in encoders:
        p = subprocess.run(
            base + enc + [f"{name}.mp4"], cwd=work, capture_output=True, text=True,
            encoding="utf-8", errors="replace", creationflags=NO_WINDOW, timeout=RENDER_SECONDS
        )
        if p.returncode == 0:
            if label == "qsv":
                _qsv_ok = True
            break
        err = p.stderr[-1200:]
        if label == "qsv":
            _qsv_ok = False
    else:
        raise RuntimeError(f"Render failed: {err}")

    cover_t = min(1.2, (end - start) / 2)
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-ss", f"{cover_t:.2f}", "-i", f"{name}.mp4", "-frames:v", "1",
         "-q:v", "3", f"{name}.jpg"],
        cwd=work, capture_output=True, creationflags=NO_WINDOW
    )

    for ext in ("mp4", "jpg", "ass"):
        f_src = work / f"{name}.{ext}"
        if f_src.exists():
            shutil.move(str(f_src), str(out_dir / f"{name}.{ext}"))

    return {
        "file": f"{name}.mp4",
        "cover": f"{name}.jpg",
        "ass": f"{name}.ass",
        "layout": layout
    }
