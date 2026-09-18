from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(r"D:\2DUnityGame\quocvinhvku.github.io")
OUT = ROOT / "output" / "happy-child-facebook-posts" / "100-chu-de" / "001-con-2-tuoi-chua-noi-nhieu"
SRC = OUT / "background-photorealistic.png"
DEST = OUT / "001-con-2-tuoi-chua-noi-nhieu-fb-2160x2700.png"

W, H = 2160, 2700
REG = r"C:\Windows\Fonts\arial.ttf"
BOLD = r"C:\Windows\Fonts\arialbd.ttf"
GREEN = (24, 112, 55)
DARK = (27, 54, 48)
ORANGE = (245, 88, 48)
YELLOW = (251, 196, 49)
CREAM = (255, 250, 237)
PALE = (239, 246, 232)
BLUE = (31, 72, 124)


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
    top = max(0, min(image.height - height, int((image.height - height) * 0.47)))
    return image.crop((left, top, left + width, top + height))


canvas = Image.new("RGB", (W, H), CREAM)
d = ImageDraw.Draw(canvas)

# Brand
d.rounded_rectangle((90, 65, 1020, 180), radius=58, fill=GREEN)
d.text((555, 123), "HAPPY CHILD • NGÔN NGỮ TRỊ LIỆU NHI", font=fit(d, "HAPPY CHILD • NGÔN NGỮ TRỊ LIỆU NHI", 820, 45), fill="white", anchor="mm")

# Headline
d.text((1080, 260), "CON 2 TUỔI", font=font(116, True), fill=GREEN, anchor="ma")
d.text((1080, 385), "CHƯA NÓI NHIỀU?", font=font(116, True), fill=ORANGE, anchor="ma")
d.text((1080, 500), "KHI NÀO CHA MẸ NÊN CHỦ ĐỘNG TÌM HIỂU?", font=fit(d, "KHI NÀO CHA MẸ NÊN CHỦ ĐỘNG TÌM HIỂU?", 1900, 72), fill=BLUE, anchor="ma")

# Photo
photo = crop_cover(Image.open(SRC).convert("RGB"), 1980, 760)
photo = photo.filter(ImageFilter.UnsharpMask(radius=0.8, percent=85, threshold=3))
mask = Image.new("L", photo.size, 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, photo.width, photo.height), radius=65, fill=255)
canvas.paste(photo, (90, 600), mask)
d = ImageDraw.Draw(canvas)

# Core information
d.text((110, 1445), "HÃY QUAN SÁT THÊM NẾU CON THƯỜNG XUYÊN:", font=fit(d, "HÃY QUAN SÁT THÊM NẾU CON THƯỜNG XUYÊN:", 1940, 61), fill=DARK)
items = [
    "Ít dùng từ để bày tỏ nhu cầu",
    "Chưa kết hợp hai từ với nhau",
    "Ít bắt chước âm thanh, lời nói",
    "Khó hiểu hướng dẫn quen thuộc",
    "Ít chỉ tay hoặc chia sẻ chú ý",
    "Giảm hoặc mất kỹ năng từng có",
]
boxes = []
for row in range(3):
    y1 = 1540 + row * 145
    boxes.extend([(90, y1, 1040, y1 + 112), (1120, y1, 2070, y1 + 112)])

for number, (box, label) in enumerate(zip(boxes, items), 1):
    d.rounded_rectangle(box, radius=38, fill=PALE, outline=(177, 211, 166), width=4)
    cy = (box[1] + box[3]) // 2
    cx = box[0] + 72
    d.ellipse((cx - 38, cy - 38, cx + 38, cy + 38), fill=YELLOW)
    d.text((cx, cy), str(number), font=font(38, True), fill=GREEN, anchor="mm")
    d.text((box[0] + 135, cy), label, font=fit(d, label, 770, 48, True, 36), fill=DARK, anchor="lm")

# Reassurance line
d.rounded_rectangle((90, 1988, 2070, 2118), radius=58, fill=ORANGE)
d.text((1080, 2053), "ĐÁNH GIÁ SỚM KHÔNG CÓ NGHĨA LÀ GẮN NHÃN", font=fit(d, "ĐÁNH GIÁ SỚM KHÔNG CÓ NGHĨA LÀ GẮN NHÃN", 1800, 58), fill="white", anchor="mm")
d.text((1080, 2190), "Mỗi trẻ có một nhịp phát triển riêng — nhưng cha mẹ không cần chờ đợi trong lo lắng.", font=fit(d, "Mỗi trẻ có một nhịp phát triển riêng — nhưng cha mẹ không cần chờ đợi trong lo lắng.", 1940, 47, True), fill=BLUE, anchor="ma")

# Contact block – always present
d.text((1080, 2310), "TƯ VẤN • ĐÁNH GIÁ • HỖ TRỢ CAN THIỆP SỚM", font=fit(d, "TƯ VẤN • ĐÁNH GIÁ • HỖ TRỢ CAN THIỆP SỚM", 1850, 48), fill=GREEN, anchor="ma")
d.text((1080, 2388), "GỌI ĐIỆN HOẶC NHẮN ZALO", font=font(45, True), fill=ORANGE, anchor="ma")
d.text((1080, 2472), "0364.776.769 – Cô Thúy", font=font(88, True), fill=GREEN, anchor="ma")
d.text((1080, 2562), "Chuyên viên Ngôn ngữ trị liệu Nhi", font=font(42, True), fill=BLUE, anchor="ma")
d.text((1080, 2633), "350/33/8 Nguyễn Văn Lượng, P.16, Q. Gò Vấp, TP. Hồ Chí Minh", font=fit(d, "350/33/8 Nguyễn Văn Lượng, P.16, Q. Gò Vấp, TP. Hồ Chí Minh", 1950, 40, False), fill=DARK, anchor="ma")

canvas.save(DEST, format="PNG", compress_level=1, optimize=False)
print(f"{DEST}\t{DEST.stat().st_size / (1024 * 1024):.2f} MB\t{W}x{H}")
