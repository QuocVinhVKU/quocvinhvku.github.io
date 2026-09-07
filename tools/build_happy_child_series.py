from __future__ import annotations

import math
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "happy-child-series-30s"
OUT.mkdir(parents=True, exist_ok=True)
W, H = 1080, 1920
FONT = Path(r"C:\Windows\Fonts\arial.ttf")
BOLD = Path(r"C:\Windows\Fonts\arialbd.ttf")
GREEN, BLUE, RED, ORANGE = "#16712B", "#173C74", "#C6153E", "#F15A32"
CREAM = "#FFFDF5"


def ft(size: int, bold: bool = False):
    return ImageFont.truetype(str(BOLD if bold else FONT), size)


def fit_bg(path: Path, blur=0) -> Image.Image:
    im = Image.open(path).convert("RGB")
    scale = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
    im = im.crop(((im.width-W)//2, (im.height-H)//2, (im.width-W)//2+W, (im.height-H)//2+H))
    return im.filter(ImageFilter.GaussianBlur(blur)) if blur else im


def wrap(draw, text: str, fnt, max_width: int):
    words, lines, line = text.split(), [], ""
    for word in words:
        trial = f"{line} {word}".strip()
        if draw.textbbox((0, 0), trial, font=fnt)[2] <= max_width:
            line = trial
        else:
            if line: lines.append(line)
            line = word
    if line: lines.append(line)
    return lines


def fit_wrapped(draw, text: str, max_size: int, max_width: int, max_lines: int):
    for size in range(max_size, 25, -2):
        fnt = ft(size, True)
        lines = wrap(draw, text, fnt, max_width)
        if len(lines) <= max_lines:
            return fnt, lines
    return ft(26, True), wrap(draw, text, ft(26, True), max_width)


def draw_center_lines(draw, lines, y, fnt, fill, gap=14):
    line_h = fnt.size + gap
    for i, line in enumerate(lines):
        box = draw.textbbox((0, 0), line, font=fnt)
        draw.text(((W-(box[2]-box[0]))/2, y+i*line_h), line, font=fnt, fill=fill)


def cover(hero: Path, kicker: str, title: str) -> Image.Image:
    im = fit_bg(hero).convert("RGBA")
    shade = Image.new("RGBA", (W, H), (9, 28, 42, 0)); d = ImageDraw.Draw(shade)
    d.rectangle((0, 0, W, 580), fill=(9, 28, 42, 150))
    d.rectangle((0, 1460, W, H), fill=(9, 28, 42, 105))
    im = Image.alpha_composite(im, shade); d = ImageDraw.Draw(im)
    d.rounded_rectangle((65, 95, 1015, 490), radius=44, fill=(255, 253, 245, 238))
    kf = ft(36, True); kb = d.textbbox((0,0), kicker, font=kf)
    d.text(((W-(kb[2]-kb[0]))/2, 145), kicker, font=kf, fill=ORANGE)
    fnt, lines = fit_wrapped(d, title, 65, 850, 3)
    draw_center_lines(d, lines, 225, fnt, GREEN, 12)
    d.text((85, 1700), "HAPPY CHILD • NGÔN NGỮ TRỊ LIỆU NHI", font=ft(30, True), fill="white", stroke_width=2, stroke_fill=BLUE)
    return im.convert("RGB")


def info(hero: Path, heading: str, bullets: list[str], accent=BLUE) -> Image.Image:
    im = fit_bg(hero, 16)
    im = ImageEnhance.Brightness(im).enhance(0.73).convert("RGBA")
    layer = Image.new("RGBA", (W,H), (0,0,0,0)); d = ImageDraw.Draw(layer)
    d.rounded_rectangle((70, 150, 1010, 1770), radius=50, fill=(255,253,245,242))
    im = Image.alpha_composite(im, layer); d = ImageDraw.Draw(im)
    fnt, lines = fit_wrapped(d, heading, 56, 820, 2)
    draw_center_lines(d, lines, 225, fnt, accent)
    y = 500
    for bullet in bullets:
        d.ellipse((125, y+10, 155, y+40), fill=ORANGE)
        bf, blines = fit_wrapped(d, bullet, 42, 750, 3)
        for j, line in enumerate(blines):
            d.text((185, y+j*(bf.size+12)), line, font=bf, fill="#263238")
        y += max(210, len(blines)*(bf.size+12)+80)
    d.text((125, 1630), "Mỗi trẻ cần được quan sát trong bối cảnh phát triển riêng.", font=ft(29, True), fill=GREEN)
    return im.convert("RGB")


def takeaway(hero: Path, title: str, body: str) -> Image.Image:
    bg = fit_bg(hero, 20)
    bg = ImageEnhance.Brightness(bg).enhance(0.55).convert("RGBA")
    layer = Image.new("RGBA", (W,H), (0,0,0,0)); d = ImageDraw.Draw(layer)
    d.rounded_rectangle((85, 360, 995, 1510), radius=55, fill=(23,60,116,235))
    bg = Image.alpha_composite(bg, layer); d = ImageDraw.Draw(bg)
    fnt, lines = fit_wrapped(d, title, 62, 780, 3)
    draw_center_lines(d, lines, 520, fnt, "#FBD55B")
    bf, blines = fit_wrapped(d, body, 44, 770, 6)
    draw_center_lines(d, blines, 850, bf, "white", 20)
    return bg.convert("RGB")


def music(path: Path):
    sr, dur = 44100, 30
    t = np.arange(sr*dur, dtype=np.float64)/sr
    chords = [(261.63,329.63,392.0),(220,261.63,329.63),(174.61,220,261.63),(196,246.94,293.66)]
    a = np.zeros_like(t)
    for i in range(12):
        start, end = int(i*2.5*sr), int((i+1)*2.5*sr)
        tt=t[start:end]; chord=chords[i%4]
        seg=sum(np.sin(2*math.pi*f*tt) for f in chord)/3
        env=np.minimum(1,np.arange(len(seg))/(0.22*sr))*np.minimum(1,np.arange(len(seg))[::-1]/(0.30*sr))
        a[start:end]+=seg*env
    a *= 0.065/max(0.001,np.max(np.abs(a)))
    pcm=np.int16(np.clip(a,-1,1)*32767)
    with wave.open(str(path),'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm.tobytes())


VIDEOS = [
    {
      "slug":"01-tang-dong-khong-phai-khong-ngoan", "kicker":"HIỂU ĐÚNG VỀ HÀNH VI",
      "title":"TRẺ TĂNG HOẠT ĐỘNG KHÔNG PHẢI LÀ TRẺ “KHÔNG NGOAN”",
      "h1":"Điều gì có thể ảnh hưởng đến khả năng chú ý?",
      "b1":["Độ tuổi và đặc điểm phát triển", "Môi trường có nhiều kích thích", "Giấc ngủ, cảm xúc và khả năng hiểu ngôn ngữ"],
      "h2":"Phụ huynh nên làm gì?", "b2":["Quan sát trẻ ở nhiều tình huống", "Chia hoạt động thành bước ngắn", "Tìm đánh giá chuyên môn khi khó khăn kéo dài"],
      "take":"HIỂU HÀNH VI TRƯỚC KHI ĐIỀU CHỈNH", "body":"Một vài biểu hiện riêng lẻ không đủ để kết luận trẻ có rối loạn."
    },
    {
      "slug":"02-chu-y-va-ngon-ngu", "kicker":"CHÚ Ý • NGÔN NGỮ",
      "title":"KHÓ TẬP TRUNG ẢNH HƯỞNG ĐẾN GIAO TIẾP THẾ NÀO?",
      "h1":"Để học ngôn ngữ, trẻ cần", "b1":["Chú ý đến người nói", "Lắng nghe và ghi nhớ thông tin", "Phản hồi và duy trì lượt giao tiếp"],
      "h2":"Trẻ có thể gặp khó khăn", "b2":["Bỏ sót một phần hướng dẫn", "Trả lời chưa đúng trọng tâm", "Khó kể chuyện theo trình tự"],
      "take":"MỤC TIÊU KHÔNG PHẢI “NGỒI YÊN TUYỆT ĐỐI”", "body":"Mục tiêu là giúp trẻ giao tiếp và tham gia hoạt động hiệu quả hơn."
    },
    {
      "slug":"03-khi-nao-danh-gia-cham-noi", "kicker":"CHẬM NÓI • ĐÁNH GIÁ SỚM",
      "title":"KHI NÀO TRẺ CHẬM NÓI CẦN ĐƯỢC ĐÁNH GIÁ?",
      "h1":"Phụ huynh nên lưu ý khi trẻ", "b1":["Ít từ hoặc câu phù hợp với độ tuổi", "Khó diễn đạt nhu cầu", "Khó hiểu hướng dẫn quen thuộc"],
      "h2":"Đặc biệt cần chủ động khi", "b2":["Trẻ ít tương tác hoặc khó giao tiếp qua lượt", "Lời nói thường khó hiểu", "Trẻ giảm hoặc mất kỹ năng từng có"],
      "take":"ĐÁNH GIÁ SỚM KHÔNG PHẢI GẮN NHÃN", "body":"Đó là bước giúp gia đình hiểu điểm mạnh và nhu cầu hiện tại của trẻ."
    },
    {
      "slug":"04-ho-tro-giao-tiep-tai-nha", "kicker":"ĐỒNG HÀNH CÙNG CON TẠI NHÀ",
      "title":"5 CÁCH GIÚP TRẺ GIAO TIẾP TỰ NHIÊN HƠN",
      "h1":"Bắt đầu từ tương tác hằng ngày", "b1":["Theo điều trẻ đang quan tâm", "Dùng câu ngắn và rõ", "Nói xong, hãy chờ trẻ phản hồi"],
      "h2":"Khuyến khích, không gây áp lực", "b2":["Mở rộng lời nói của trẻ", "Tôn trọng nhìn, chỉ tay, cử chỉ và lời nói", "Hạn chế liên tục yêu cầu: “Nói đi!”"],
      "take":"GIAO TIẾP TỐT BẮT ĐẦU TỪ KẾT NỐI", "body":"Trẻ học tốt hơn trong tương tác vui vẻ, có ý nghĩa và được lặp lại."
    },
    {
      "slug":"05-happy-child-dong-hanh", "kicker":"HAPPY CHILD",
      "title":"MỖI TRẺ CÓ MỘT CÁCH HỌC VÀ GIAO TIẾP KHÁC NHAU",
      "h1":"Hỗ trợ theo nhu cầu của từng trẻ", "b1":["Ngôn ngữ và giao tiếp", "Chú ý, tương tác xã hội", "Nói ngọng, nói lắp và khó khăn học tập"],
      "h2":"Tư vấn • Đánh giá • Can thiệp sớm", "b2":["Nhận biết điểm mạnh và khó khăn", "Xây dựng mục tiêu phù hợp", "Đồng hành cùng trẻ và gia đình"],
      "take":"HIỂU CON ĐÚNG HƠN", "body":"Đồng hành cùng con bằng hướng hỗ trợ phù hợp hơn."
    }
]


def main():
    if len(sys.argv) != 9:
        raise SystemExit("usage: script hero1 hero2 hero3 hero4 hero5 endcard ffmpeg")
    heroes=list(map(Path,sys.argv[1:6])); endcard=Path(sys.argv[6]); ffmpeg=Path(sys.argv[7]); voice_dir=Path(sys.argv[8])
    music_path=OUT/'music-30s.wav'; music(music_path)
    durations=[6,8,8,4,4]
    for i,(cfg,hero) in enumerate(zip(VIDEOS,heroes),1):
        folder=OUT/cfg['slug']; folder.mkdir(parents=True,exist_ok=True)
        slides=[cover(hero,cfg['kicker'],cfg['title']), info(hero,cfg['h1'],cfg['b1']), info(hero,cfg['h2'],cfg['b2'],GREEN), takeaway(hero,cfg['take'],cfg['body']), fit_bg(endcard)]
        paths=[]
        for n,im in enumerate(slides,1):
            p=folder/f'slide-{n}.png'; im.save(p); paths.append(p)
        inputs=[]; filters=[]
        for n,(p,dur) in enumerate(zip(paths,durations)):
            inputs += ['-loop','1','-framerate','30','-t',str(dur),'-i',str(p)]
            filters.append(f'[{n}:v]scale=1080:1920,format=yuv420p[v{n}]')
        filters.append('[v0][v1][v2][v3][v4]concat=n=5:v=1:a=0[v]')
        voice=voice_dir/f"voice-{i}.mp3"; output=folder/f"{cfg['slug']}-30s.mp4"
        cmd=[str(ffmpeg),'-y',*inputs,'-i',str(voice),'-i',str(music_path),'-filter_complex',';'.join(filters)+f';[5:a]volume=1.0,apad,atrim=duration=30[vo];[6:a]volume=0.13[mu];[vo][mu]amix=inputs=2:duration=first:normalize=0[a]','-map','[v]','-map','[a]','-t','30','-r','30','-c:v','libx264','-preset','medium','-crf','19','-c:a','aac','-b:a','160k','-movflags','+faststart',str(output)]
        subprocess.run(cmd,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        print(output)


if __name__=='__main__': main()
