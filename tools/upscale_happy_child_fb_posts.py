from pathlib import Path
from PIL import Image, ImageFilter


ROOT = Path(r"D:\2DUnityGame\quocvinhvku.github.io")
SOURCE = ROOT / "output" / "happy-child-facebook-posts" / "v2-noi-dung-trong-anh"
OUTPUT = ROOT / "output" / "happy-child-facebook-posts" / "v2-noi-dung-trong-anh-hd"
OUTPUT.mkdir(parents=True, exist_ok=True)

for source in sorted(SOURCE.glob("*.png")):
    image = Image.open(source).convert("RGB")
    image = image.resize((2160, 2700), Image.Resampling.LANCZOS)
    image = image.filter(ImageFilter.UnsharpMask(radius=1.0, percent=105, threshold=3))
    destination = OUTPUT / source.name.replace("-1080x1350", "-hd-2160x2700")
    image.save(destination, format="PNG", compress_level=4, optimize=False)
    size_mb = destination.stat().st_size / (1024 * 1024)
    print(f"{destination}\t{image.width}x{image.height}\t{size_mb:.2f} MB")
