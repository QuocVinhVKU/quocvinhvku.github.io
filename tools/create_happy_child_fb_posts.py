from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(r"D:\2DUnityGame\quocvinhvku.github.io")
OUT = ROOT / "output" / "happy-child-facebook-posts"
OUT.mkdir(parents=True, exist_ok=True)

FONT_REG = r"C:\Windows\Fonts\arial.ttf"
FONT_BOLD = r"C:\Windows\Fonts\arialbd.ttf"

POSTS = [
    {
        "source": r"D:\2DUnityGame\.codex\generated_images\01a031e3-f1c2-77c2-a5c6-63abb9af3045\exec-a8a77eb6-a888-4f72-9559-d872f9048346.png",
        "slug": "01-tre-tang-dong-khong-phai-khong-ngoan",
        "kicker": "HIỂU HÀNH VI CỦA CON",
        "title": ["CON KHÓ NGỒI YÊN", "KHÔNG CÓ NGHĨA LÀ", "CON KHÔNG NGOAN"],
        "accent": "Hiểu đúng để đồng hành đúng",
    },
    {
        "source": r"D:\2DUnityGame\.codex\generated_images\01a031e3-f1c2-77c2-a5c6-63abb9af3045\exec-8c803f8d-ad02-4602-a3f7-43eaf5a20a0e.png",
        "slug": "02-chu-y-va-ngon-ngu",
        "kicker": "CHÚ Ý VÀ GIAO TIẾP",
        "title": ["TRẺ KHÓ TẬP TRUNG", "CÓ THỂ GẶP KHÓ KHĂN", "KHI GIAO TIẾP"],
        "accent": "Đừng chỉ nhìn vào hành vi",
    },
    {
        "source": r"D:\2DUnityGame\.codex\generated_images\01a031e3-f1c2-77c2-a5c6-63abb9af3045\exec-5ba0dc85-f89b-4114-8bf8-1b62b76d9b8e.png",
        "slug": "03-khi-nao-can-danh-gia-cham-noi",
        "kicker": "KHI CON CHẬM NÓI",
        "title": ["“CHỜ CON TỰ NÓI...”", "CÓ PHẢI LÚC NÀO", "CŨNG PHÙ HỢP?"],
        "accent": "Đánh giá sớm không phải gắn nhãn",
    },
    {
        "source": r"D:\2DUnityGame\.codex\generated_images\01a031e3-f1c2-77c2-a5c6-63abb9af3045\exec-d4fd1e90-e648-4108-9b24-01284ac83a91.png",
        "slug": "04-ho-tro-giao-tiep-tai-nha",
        "kicker": "ĐỒNG HÀNH CÙNG CON TẠI NHÀ",
        "title": ["5 CÁCH GIÚP CON", "GIAO TIẾP TỰ NHIÊN", "MỖI NGÀY"],
        "accent": "Bắt đầu từ điều con quan tâm",
    },
    {
        "source": r"D:\2DUnityGame\.codex\generated_images\01a031e3-f1c2-77c2-a5c6-63abb9af3045\exec-c97bef46-69af-4b32-bb72-6d1a159eb112.png",
        "slug": "05-happy-child-dong-hanh-cung-con",
        "kicker": "HAPPY CHILD • NGÔN NGỮ TRỊ LIỆU NHI",
        "title": ["MỖI TRẺ CÓ MỘT CÁCH", "HỌC VÀ GIAO TIẾP", "KHÁC NHAU"],
        "accent": "Tư vấn • Đánh giá • Can thiệp sớm",
    },
]


def fit_font(draw, text, max_width, start_size, min_size=24):
    for size in range(start_size, min_size - 1, -1):
        font = ImageFont.truetype(FONT_BOLD, size)
        if draw.textbbox((0, 0), text, font=font)[2] <= max_width:
            return font
    return ImageFont.truetype(FONT_BOLD, min_size)


def rounded(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


for post in POSTS:
    image = Image.open(post["source"]).convert("RGB").resize((1080, 1350), Image.Resampling.LANCZOS)

    # Preserve the photographic scene while creating calm, high-contrast text zones.
    shade = Image.new("RGBA", image.size, (0, 0, 0, 0))
    shade_px = shade.load()
    for y in range(0, 800):
        alpha = int(185 * max(0, 1 - y / 850))
        for x in range(1080):
            shade_px[x, y] = (8, 35, 29, alpha)
    image = Image.alpha_composite(image.convert("RGBA"), shade)

    bottom = Image.new("RGBA", image.size, (0, 0, 0, 0))
    bd = ImageDraw.Draw(bottom)
    bd.rectangle((0, 1160, 1080, 1350), fill=(250, 248, 240, 245))
    image = Image.alpha_composite(image, bottom)
    draw = ImageDraw.Draw(image)

    green = (27, 112, 55, 255)
    coral = (244, 91, 51, 255)
    cream = (255, 250, 238, 255)
    navy = (25, 55, 91, 255)

    rounded(draw, (64, 62, 495, 118), 28, green)
    kicker_font = fit_font(draw, post["kicker"], 385, 25, 19)
    draw.text((92, 79), post["kicker"], font=kicker_font, fill="white", anchor="lm")

    y = 165
    for i, line in enumerate(post["title"]):
        title_font = fit_font(draw, line, 940, 65, 41)
        color = (255, 214, 78, 255) if i == len(post["title"]) - 1 else cream
        draw.text((64, y), line, font=title_font, fill=color, stroke_width=1, stroke_fill=(0, 0, 0, 45))
        y += title_font.size + 16

    accent_font = fit_font(draw, post["accent"], 860, 34, 24)
    accent_w = draw.textbbox((0, 0), post["accent"], font=accent_font)[2]
    rounded(draw, (64, y + 20, min(1016, 114 + accent_w), y + 82), 20, (244, 91, 51, 235))
    draw.text((89, y + 51), post["accent"], font=accent_font, fill="white", anchor="lm")

    brand_font = ImageFont.truetype(FONT_BOLD, 37)
    contact_font = ImageFont.truetype(FONT_BOLD, 31)
    address_font = ImageFont.truetype(FONT_REG, 25)
    draw.text((64, 1202), "HAPPY CHILD", font=brand_font, fill=green)
    draw.text((1016, 1206), "0364.776.769 – Cô Thúy", font=contact_font, fill=coral, anchor="ra")
    draw.text((64, 1265), "Chuyên viên Ngôn ngữ trị liệu Nhi", font=address_font, fill=navy)
    draw.text((1016, 1303), "350/33/8 Nguyễn Văn Lượng, P.16, Q. Gò Vấp, TP.HCM", font=address_font, fill=(45, 54, 58), anchor="ra")

    out = OUT / f"{post['slug']}-fb-1080x1350.png"
    image.convert("RGB").save(out, quality=95)
    print(out)
