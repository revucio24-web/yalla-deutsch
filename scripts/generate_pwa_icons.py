from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / "public"

for size in (192, 512):
    image = Image.new("RGB", (size, size), "#102e45")
    draw = ImageDraw.Draw(image)
    draw.ellipse((size * .17, size * .17, size * .83, size * .83), fill="#f2b544")
    draw.rounded_rectangle(
        (size * .34, size * .27, size * .66, size * .73),
        radius=int(size * .06),
        fill="#102e45",
    )
    draw.rectangle((size * .43, size * .38, size * .57, size * .62), fill="#f7f2e8")
    image.save(OUT / f"icon-{size}.png", optimize=True)
