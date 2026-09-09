from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"D:\2DUnityGame\quocvinhvku.github.io")
OUT = ROOT / "output" / "happy-child-facebook-posts" / "v2-noi-dung-trong-anh"
OUT.mkdir(parents=True, exist_ok=True)
REG = r"C:\Windows\Fonts\arial.ttf"
BOLD = r"C:\Windows\Fonts\arialbd.ttf"

W, H = 1080, 1350
GREEN = (23, 111, 54)
DARK = (27, 54, 48)
ORANGE = (244, 91, 51)
YELLOW = (250, 197, 52)
CREAM = (255, 250, 237)
PALE = (239, 246, 232)
BLUE = (32, 73, 125)

POSTS = [
    dict(
        src=r"D:\2DUnityGame\.codex\generated_images\01a031e3-f1c2-77c2-a5c6-63abb9af3045\exec-a8a77eb6-a888-4f72-9559-d872f9048346.png",
        slug="01-tre-tang-dong-khong-phai-khong-ngoan",
        title=["CON KHÓ NGỒI YÊN", "KHÔNG CÓ NGHĨA LÀ", "CON KHÔNG NGOAN"],
        intro="Hành vi của trẻ có thể chịu ảnh hưởng bởi nhiều yếu tố:",
        items=["Độ tuổi & phát triển", "Khả năng hiểu ngôn ngữ", "Môi trường nhiều kích thích", "Giấc ngủ, cảm xúc & sức khỏe"],
        takeaway="KHÔNG VỘI GẮN NHÃN • HÃY HIỂU CON TRƯỚC",
    ),
    dict(
        src=r"D:\2DUnityGame\.codex\generated_images\01a031e3-f1c2-77c2-a5c6-63abb9af3045\exec-8c803f8d-ad02-4602-a3f7-43eaf5a20a0e.png",
        slug="02-chu-y-va-ngon-ngu",
        title=["KHÓ TẬP TRUNG", "ẢNH HƯỞNG GIAO TIẾP", "NHƯ THẾ NÀO?"],
        intro="Khi khả năng chú ý còn hạn chế, trẻ có thể:",
        items=["Bỏ sót một phần hướng dẫn", "Trả lời chưa đúng trọng tâm", "Khó chờ lượt trò chuyện", "Khó kể việc theo trình tự"],
        takeaway="NGÔN NGỮ TRỊ LIỆU KHÔNG CHỈ LÀ SỬA PHÁT ÂM",
    ),
    dict(
        src=r"D:\2DUnityGame\.codex\generated_images\01a031e3-f1c2-77c2-a5c6-63abb9af3045\exec-5ba0dc85-f89b-4114-8bf8-1b62b76d9b8e.png",
        slug="03-khi-nao-can-danh-gia-cham-noi",
        title=["“CHỜ CON TỰ NÓI...”", "CÓ PHẢI LÚC NÀO", "CŨNG PHÙ HỢP?"],
        intro="Nên chủ động tìm hiểu khi trẻ thường xuyên:",
        items=["Ít từ/câu phù hợp độ tuổi", "Khó hiểu hoặc diễn đạt nhu cầu", "Ít chủ động tương tác", "Nói khó hiểu hoặc mất kỹ năng"],
        takeaway="ĐÁNH GIÁ SỚM KHÔNG CÓ NGHĨA LÀ GẮN NHÃN",
    ),
    dict(
        src=r"D:\2DUnityGame\.codex\generated_images\01a031e3-f1c2-77c2-a5c6-63abb9af3045\exec-d4fd1e90-e648-4108-9b24-01284ac83a91.png",
        slug="04-ho-tro-giao-tiep-tai-nha",
        title=["5 CÁCH GIÚP CON", "GIAO TIẾP TỰ NHIÊN", "MỖI NGÀY"],
        intro="Những thay đổi nhỏ phụ huynh có thể thực hiện tại nhà:",
        items=["Theo điều con đang quan tâm", "Dùng câu ngắn, rõ ràng", "Nói xong hãy chờ con", "Mở rộng lời nói của con"],
        takeaway="GHI NHẬN ÁNH MẮT • CỬ CHỈ • CHỈ TAY • LỜI NÓI",
    ),
    dict(
        src=r"D:\2DUnityGame\.codex\generated_images\01a031e3-f1c2-77c2-a5c6-63abb9af3045\exec-c97bef46-69af-4b32-bb72-6d1a159eb112.png",
        slug="05-happy-child-dong-hanh-cung-con",
        title=["MỖI TRẺ MỘT CÁCH HỌC", "MỖI CON MỘT NHỊP", "PHÁT TRIỂN"],
        intro="Tư vấn – đánh giá – hỗ trợ can thiệp sớm về:",
        items=["Ngôn ngữ & giao tiếp", "Chậm nói • Nói ngọng • Nói lắp", "Chú ý & tương tác xã hội", "Học tập • Nghe – nói"],
        takeaway="HIỂU CON ĐÚNG HƠN • ĐỒNG HÀNH PHÙ HỢP HƠN",
    ),
]


def font(size, bold=False):
    return ImageFont.truetype(BOLD if bold else REG, size)


def fit(draw, text, width, size, bold=True, minimum=20):
    while size > minimum and draw.textbbox((0, 0), text, font=font(size, bold))[2] > width:
        size -= 1
    return font(size, bold)


def crop_cover(im, size, focus_y=0.58):
    tw, th = size
    scale = max(tw / im.width, th / im.height)
    nw, nh = int(im.width * scale), int(im.height * scale)
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left = max(0, (nw - tw) // 2)
    top = max(0, min(nh - th, int(nh * focus_y - th * 0.58)))
    return im.crop((left, top, left + tw, top + th))


for p in POSTS:
    canvas = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(canvas)

    # Header / brand
    d.rounded_rectangle((44, 35, 510, 92), radius=28, fill=GREEN)
    d.text((277, 64), "HAPPY CHILD • NGÔN NGỮ TRỊ LIỆU NHI", font=fit(d, "HAPPY CHILD • NGÔN NGỮ TRỊ LIỆU NHI", 410, 23), fill="white", anchor="mm")

    y = 124
    for i, line in enumerate(p["title"]):
        f = fit(d, line, 985, 57, True, 35)
        d.text((540, y), line, font=f, fill=GREEN if i < 2 else ORANGE, anchor="ma")
        y += f.size + 7

    # Photo window
    photo_top, photo_bottom = 330, 735
    photo = crop_cover(Image.open(p["src"]).convert("RGB"), (992, photo_bottom - photo_top))
    mask = Image.new("L", photo.size, 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, photo.width, photo.height), radius=34, fill=255)
    canvas.paste(photo, (44, photo_top), mask)
    d = ImageDraw.Draw(canvas)

    # Information block
    d.text((54, 777), p["intro"], font=fit(d, p["intro"], 970, 31, True), fill=DARK)
    cards = [(44, 830, 520, 912), (560, 830, 1036, 912), (44, 930, 520, 1012), (560, 930, 1036, 1012)]
    for idx, (box, label) in enumerate(zip(cards, p["items"]), 1):
        d.rounded_rectangle(box, radius=25, fill=PALE, outline=(187, 213, 174), width=2)
        cx, cy = box[0] + 39, (box[1] + box[3]) // 2
        d.ellipse((cx - 21, cy - 21, cx + 21, cy + 21), fill=YELLOW)
        d.text((cx, cy), str(idx), font=font(23, True), fill=GREEN, anchor="mm")
        f = fit(d, label, box[2] - box[0] - 95, 27, True, 21)
        d.text((box[0] + 76, cy), label, font=f, fill=DARK, anchor="lm")

    d.rounded_rectangle((44, 1043, 1036, 1110), radius=28, fill=ORANGE)
    d.text((540, 1077), p["takeaway"], font=fit(d, p["takeaway"], 920, 29, True, 21), fill="white", anchor="mm")

    # Strong CTA and contact
    d.text((540, 1153), "ĐỪNG CHỜ TRONG LO LẮNG — HÃY CHỦ ĐỘNG TÌM HIỂU", font=fit(d, "ĐỪNG CHỜ TRONG LO LẮNG — HÃY CHỦ ĐỘNG TÌM HIỂU", 972, 31, True), fill=BLUE, anchor="ma")
    d.text((540, 1205), "GỌI ĐIỆN HOẶC NHẮN ZALO", font=font(24, True), fill=ORANGE, anchor="ma")
    d.text((540, 1238), "0364.776.769 – Cô Thúy", font=fit(d, "0364.776.769 – Cô Thúy", 920, 46, True), fill=GREEN, anchor="ma")
    d.text((540, 1293), "Chuyên viên Ngôn ngữ trị liệu Nhi", font=font(21, True), fill=BLUE, anchor="ma")
    address = "350/33/8 Nguyễn Văn Lượng, P.16, Q. Gò Vấp, TP.HCM"
    d.text((540, 1321), address, font=fit(d, address, 980, 20, False, 17), fill=DARK, anchor="ma")

    out = OUT / f"{p['slug']}-v2-1080x1350.png"
    canvas.save(out, quality=96)
    print(out)
