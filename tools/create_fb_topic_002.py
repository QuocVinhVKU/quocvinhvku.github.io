from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(r"D:\2DUnityGame\quocvinhvku.github.io")
OUT = ROOT / "output" / "happy-child-facebook-posts" / "100-chu-de" / "002-roi-loan-am-loi-noi"
SRC = OUT / "background-photorealistic.png"
DEST = OUT / "002-roi-loan-am-loi-noi-fb-v2-2160x2700.png"

W, H = 2160, 2700
REG = r"C:\Windows\Fonts\arial.ttf"
BOLD = r"C:\Windows\Fonts\arialbd.ttf"
GREEN, DARK = (24, 112, 55), (27, 54, 48)
ORANGE, YELLOW = (245, 88, 48), (251, 196, 49)
CREAM, PALE, BLUE = (255, 250, 237), (239, 246, 232), (31, 72, 124)


def font(size, bold=False):
    return ImageFont.truetype(BOLD if bold else REG, size)


def fit(draw, text, max_width, start, bold=True, minimum=34):
    for size in range(start, minimum - 1, -1):
        f = font(size, bold)
        if draw.textbbox((0, 0), text, font=f)[2] <= max_width:
            return f
    return font(minimum, bold)


def crop_cover(image, width, height):
    scale = max(width / image.width, height / image.height)
    image = image.resize((int(image.width * scale), int(image.height * scale)), Image.Resampling.LANCZOS)
    left = max(0, (image.width - width) // 2)
    top = max(0, min(image.height - height, int((image.height - height) * 0.55)))
    return image.crop((left, top, left + width, top + height))


canvas = Image.new("RGB", (W, H), CREAM)
d = ImageDraw.Draw(canvas)

d.rounded_rectangle((90, 65, 1020, 180), radius=58, fill=GREEN)
d.text((555, 123), "HAPPY CHILD • NGÔN NGỮ TRỊ LIỆU NHI", font=fit(d, "HAPPY CHILD • NGÔN NGỮ TRỊ LIỆU NHI", 820, 45), fill="white", anchor="mm")

d.text((1080, 245), "RỐI LOẠN ÂM LỜI NÓI", font=fit(d, "RỐI LOẠN ÂM LỜI NÓI", 1900, 108), fill=GREEN, anchor="ma")
d.text((1080, 382), "KHI NÀO CẦN", font=font(94, True), fill=ORANGE, anchor="ma")
d.text((1080, 490), "CAN THIỆP CHỈNH ÂM?", font=fit(d, "CAN THIỆP CHỈNH ÂM?", 1900, 94), fill=BLUE, anchor="ma")

photo = crop_cover(Image.open(SRC).convert("RGB"), 1980, 760)
photo = photo.filter(ImageFilter.UnsharpMask(radius=0.8, percent=85, threshold=3))
mask = Image.new("L", photo.size, 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, photo.width, photo.height), radius=65, fill=255)
canvas.paste(photo, (90, 600), mask)
d = ImageDraw.Draw(canvas)

d.text((110, 1435), "PHÁT ÂM RÕ DẦN THEO ĐỘ TUỔI", font=font(57, True), fill=DARK)
age_cards = [
    ((90, 1520, 1040, 1685), "2–3 TUỔI", "Lời nói đang rõ dần; người lạ có thể chưa hiểu hết"),
    ((1120, 1520, 2070, 1685), "3–4 TUỔI", "Đến khoảng 4 tuổi, người khác thường hiểu phần lớn lời nói"),
]
for box, age, detail in age_cards:
    d.rounded_rectangle(box, radius=40, fill=PALE, outline=(177, 211, 166), width=4)
    d.text((box[0] + 45, box[1] + 35), age, font=font(43, True), fill=GREEN)
    d.text((box[0] + 45, box[1] + 105), detail, font=fit(d, detail, 860, 38, False, 29), fill=DARK, anchor="lm")

d.text((110, 1745), "NÊN ĐÁNH GIÁ KHI TRẺ THƯỜNG XUYÊN:", font=fit(d, "NÊN ĐÁNH GIÁ KHI TRẺ THƯỜNG XUYÊN:", 1940, 52), fill=DARK)
items = [
    "Người thân cũng khó hiểu lời trẻ",
    "Bỏ, thay hoặc làm sai nhiều âm",
    "Cùng một từ nhưng nói nhiều kiểu",
    "Ảnh hưởng giao tiếp và học tập",
]
boxes = [(90, 1825, 1040, 1932), (1120, 1825, 2070, 1932), (90, 1960, 1040, 2067), (1120, 1960, 2070, 2067)]

for number, (box, label) in enumerate(zip(boxes, items), 1):
    d.rounded_rectangle(box, radius=38, fill=PALE, outline=(177, 211, 166), width=4)
    cy, cx = (box[1] + box[3]) // 2, box[0] + 72
    d.ellipse((cx - 38, cy - 38, cx + 38, cy + 38), fill=YELLOW)
    d.text((cx, cy), str(number), font=font(38, True), fill=GREEN, anchor="mm")
    d.text((box[0] + 135, cy), label, font=fit(d, label, 770, 47, True, 34), fill=DARK, anchor="lm")

d.rounded_rectangle((90, 2110, 2070, 2235), radius=58, fill=ORANGE)
d.text((1080, 2173), "CHỈNH ÂM HIỆU QUẢ BẮT ĐẦU TỪ ĐÁNH GIÁ ĐÚNG", font=fit(d, "CHỈNH ÂM HIỆU QUẢ BẮT ĐẦU TỪ ĐÁNH GIÁ ĐÚNG", 1810, 58), fill="white", anchor="mm")
d.text((1080, 2288), "Không ép trẻ nói lại liên tục • Không tự sửa từng âm theo cảm tính", font=fit(d, "Không ép trẻ nói lại liên tục • Không tự sửa từng âm theo cảm tính", 1940, 43, True), fill=BLUE, anchor="ma")

d.text((1080, 2370), "TƯ VẤN • ĐÁNH GIÁ • HỖ TRỢ CAN THIỆP SỚM", font=fit(d, "TƯ VẤN • ĐÁNH GIÁ • HỖ TRỢ CAN THIỆP SỚM", 1850, 42), fill=GREEN, anchor="ma")
d.text((1080, 2435), "GỌI ĐIỆN HOẶC NHẮN ZALO", font=font(39, True), fill=ORANGE, anchor="ma")
d.text((1080, 2510), "0364.776.769 – Cô Thúy", font=font(78, True), fill=GREEN, anchor="ma")
d.text((1080, 2584), "Chuyên viên Ngôn ngữ trị liệu Nhi", font=font(36, True), fill=BLUE, anchor="ma")
d.text((1080, 2632), "350/33/8 Nguyễn Văn Lượng, P.16, Q. Gò Vấp, TP. Hồ Chí Minh", font=fit(d, "350/33/8 Nguyễn Văn Lượng, P.16, Q. Gò Vấp, TP. Hồ Chí Minh", 1950, 34, False), fill=DARK, anchor="ma")
d.text((1080, 2677), "Nguồn chuyên môn: ASHA – Communication Milestones & Speech Sound Disorders", font=fit(d, "Nguồn chuyên môn: ASHA – Communication Milestones & Speech Sound Disorders", 1900, 25, False, 20), fill=(80, 92, 89), anchor="ma")

canvas.save(DEST, format="PNG", compress_level=1, optimize=False)
print(f"{DEST}\t{DEST.stat().st_size / (1024 * 1024):.2f} MB\t{W}x{H}")
