from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SIZE = 512

icon = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
mask = Image.new("L", (SIZE, SIZE), 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, SIZE - 1, SIZE - 1), radius=112, fill=255)

gradient = Image.new("RGBA", (SIZE, SIZE))
gradient_draw = ImageDraw.Draw(gradient)
start = (24, 33, 62)
end = (81, 88, 223)
for y in range(SIZE):
    ratio = y / (SIZE - 1)
    color = tuple(round(a + (b - a) * ratio) for a, b in zip(start, end)) + (255,)
    gradient_draw.line((0, y, SIZE, y), fill=color)
icon.paste(gradient, (0, 0), mask)

draw = ImageDraw.Draw(icon)
draw.rounded_rectangle((72, 411, 440, 472), radius=25, fill=(255, 212, 71, 255))
draw.ellipse((346, 50, 462, 166), fill=(255, 82, 45, 255))
draw.line((380, 108, 428, 108), fill="white", width=17)
draw.line((404, 84, 404, 132), fill="white", width=17)

font_path = Path("C:/Windows/Fonts/arialbd.ttf")
font = ImageFont.truetype(str(font_path), 276)
draw.text((244, 253), "€", font=font, fill="white", anchor="mm", stroke_width=1)

icon.save(PUBLIC / "favicon-512.png", optimize=True)
icon.resize((192, 192), Image.Resampling.LANCZOS).save(PUBLIC / "favicon-192.png", optimize=True)
icon.resize((48, 48), Image.Resampling.LANCZOS).save(PUBLIC / "favicon-48.png", optimize=True)
icon.save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
