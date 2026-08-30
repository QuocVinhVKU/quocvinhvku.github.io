from __future__ import annotations

import math
import os
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "happy-child-video"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1080, 1920
FONT_REG = Path(r"C:\Windows\Fonts\arial.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\arialbd.ttf")


def font(size: int, bold: bool = False):
    return ImageFont.truetype(str(FONT_BOLD if bold else FONT_REG), size)


def fit_bg(path: Path) -> Image.Image:
    im = Image.open(path).convert("RGB")
    scale = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
    x = (im.width - W) // 2
    y = (im.height - H) // 2
    return im.crop((x, y, x + W, y + H))


def rounded_panel(base, xy, fill, radius=36):
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle(xy, radius=radius, fill=fill)
    return Image.alpha_composite(base.convert("RGBA"), layer)


def centered(draw, text, y, fnt, fill, stroke=0, stroke_fill="white"):
    box = draw.textbbox((0, 0), text, font=fnt, stroke_width=stroke)
    x = (W - (box[2] - box[0])) // 2
    draw.text((x, y), text, font=fnt, fill=fill, stroke_width=stroke, stroke_fill=stroke_fill)


def fitted_font(draw, text: str, max_size: int, max_width: int, bold: bool = True):
    size = max_size
    while size > 24:
        fnt = font(size, bold)
        box = draw.textbbox((0, 0), text, font=fnt)
        if box[2] - box[0] <= max_width:
            return fnt
        size -= 2
    return font(size, bold)


def scene(path: Path, title: str, subtitle: str, accent: str, tags: list[str] | None = None) -> Image.Image:
    im = fit_bg(path)
    im = ImageEnhance.Color(im).enhance(0.96)
    im = ImageEnhance.Contrast(im).enhance(0.98)
    rgba = im.convert("RGBA")
    shade = Image.new("RGBA", rgba.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shade)
    sd.rectangle((0, 0, W, 410), fill=(17, 35, 53, 115))
    sd.rectangle((0, 1540, W, H), fill=(17, 35, 53, 95))
    rgba = Image.alpha_composite(rgba, shade)
    rgba = rounded_panel(rgba, (70, 105, W - 70, 315), (255, 255, 255, 235), 34)
    d = ImageDraw.Draw(rgba)
    centered(d, title, 140, fitted_font(d, title, 64, W - 150), accent)
    centered(d, subtitle, 232, font(33, True), "#173C74")
    if tags:
        line = "  •  ".join(tags)
        centered(d, line, 1625, font(34, True), "white", 2, "#173C74")
    return rgba.convert("RGB")


def end_card() -> Image.Image:
    im = Image.new("RGB", (W, H), "#FFFDF5")
    d = ImageDraw.Draw(im)
    # Child-friendly geometric accents derived from the supplied poster palette.
    d.ellipse((-140, -120, 330, 350), fill="#DFF3F1")
    d.ellipse((800, -130, 1190, 260), fill="#FBD55B")
    d.polygon([(860, 270), (1080, 365), (1080, 175)], fill="#FF8B3D")
    d.ellipse((-120, 1570, 300, 1990), fill="#DDE9FF")
    d.ellipse((850, 1620, 1190, 1960), fill="#D9F0D0")
    centered(d, "HAPPY CHILD", 310, font(104, True), "#16712B")
    centered(d, "NGÔN NGỮ TRỊ LIỆU NHI", 455, font(52, True), "#C6153E")
    d.rounded_rectangle((100, 605, 980, 790), radius=40, fill="#173C74")
    centered(d, "TƯ VẤN – ĐÁNH GIÁ", 642, font(48, True), "white")
    centered(d, "CAN THIỆP SỚM CHO TRẺ", 704, font(43, True), "#FBD55B")
    centered(d, "0364.776.769 – Cô Thúy", 920, font(58, True), "#16712B")
    centered(d, "Chuyên viên Ngôn ngữ trị liệu Nhi", 1010, font(36, True), "#173C74")
    d.rounded_rectangle((145, 1125, 935, 1275), radius=75, fill="#F15A32")
    centered(d, "LIÊN HỆ TƯ VẤN", 1160, font(50, True), "white")
    centered(d, "350/33/8 Nguyễn Văn Lượng, P.16,", 1405, font(35), "#263238")
    centered(d, "Q. Gò Vấp, TP. Hồ Chí Minh", 1458, font(35), "#263238")
    centered(d, "Hiểu con đúng hơn – Đồng hành phù hợp hơn", 1700, font(32, True), "#16712B")
    return im


def music_wav(path: Path):
    sr, dur = 44100, 10.0
    t = np.arange(int(sr * dur), dtype=np.float64) / sr
    chords = [(261.63, 329.63, 392.00), (220.00, 261.63, 329.63), (174.61, 220.00, 261.63), (196.00, 246.94, 293.66)]
    audio = np.zeros_like(t)
    for i, chord in enumerate(chords):
        start = int(i * 2.5 * sr)
        end = int(min((i + 1) * 2.5 * sr, len(t)))
        tt = t[start:end]
        seg = sum(np.sin(2 * math.pi * f * tt) for f in chord) / len(chord)
        env = np.minimum(1, np.arange(len(seg)) / (0.20 * sr)) * np.minimum(1, np.arange(len(seg))[::-1] / (0.25 * sr))
        audio[start:end] += seg * env
    audio += 0.14 * np.sin(2 * math.pi * 659.25 * t) * (0.5 + 0.5 * np.sin(2 * math.pi * 0.5 * t))
    audio *= 0.075 / max(0.001, np.max(np.abs(audio)))
    pcm = np.int16(np.clip(audio, -1, 1) * 32767)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(sr); wf.writeframes(pcm.tobytes())


def main():
    if len(sys.argv) != 6:
        raise SystemExit("usage: build_happy_child_video.py scene1 scene2 scene3 voice.mp3 ffmpeg.exe")
    s1, s2, s3, voice, ffmpeg = map(Path, sys.argv[1:])
    frames = [
        scene(s1, "CON CÓ ĐANG GẶP KHÓ KHĂN?", "Nhận biết sớm để hiểu con", "#16712B", ["Chậm nói", "Ngôn ngữ", "Chú ý", "Tương tác"]),
        scene(s2, "TƯ VẤN • ĐÁNH GIÁ", "Hiểu rõ hơn nhu cầu của trẻ", "#173C74", ["NGÔN NGỮ", "GIAO TIẾP", "HỌC TẬP"]),
        scene(s3, "CAN THIỆP SỚM", "Đồng hành phù hợp với từng trẻ", "#C6153E", ["Khuyến khích", "Tương tác", "Giao tiếp"]),
        end_card(),
    ]
    stills = []
    for i, im in enumerate(frames, 1):
        p = OUT / f"scene-{i}.png"; im.save(p, quality=95); stills.append(p)
    music = OUT / "music.wav"; music_wav(music)
    output = OUT / "happy-child-10s-vertical.mp4"
    durations = [2.2, 3.0, 2.6, 2.2]
    inputs = []
    filters = []
    for i, (p, seconds) in enumerate(zip(stills, durations)):
        inputs += ["-loop", "1", "-framerate", "30", "-t", str(seconds), "-i", str(p)]
        z = "min(zoom+0.00045,1.035)" if i < 3 else "1.0"
        filters.append(f"[{i}:v]zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30,trim=duration={seconds},setpts=PTS-STARTPTS,format=yuv420p[v{i}]")
    filters.append("[v0][v1][v2][v3]concat=n=4:v=1:a=0[v]")
    cmd = [str(ffmpeg), "-y", *inputs, "-i", str(voice), "-i", str(music),
           "-filter_complex", ";".join(filters) + ";[4:a]volume=1.0,apad,atrim=duration=10[vo];[5:a]volume=0.16[mu];[vo][mu]amix=inputs=2:duration=first:normalize=0[a]",
           "-map", "[v]", "-map", "[a]", "-t", "10", "-r", "30", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(output)]
    subprocess.run(cmd, check=True)
    print(output)


if __name__ == "__main__":
    main()
