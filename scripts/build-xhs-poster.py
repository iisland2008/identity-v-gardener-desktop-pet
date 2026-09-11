#!/usr/bin/env python3
"""Render the launch poster for the Gardener Codex pet."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "poster" / "gardener-launch"
CANVAS = (1080, 1440)

FONT_CN = "/System/Library/Fonts/Hiragino Sans GB.ttc"
FONT_MONO = "/System/Library/Fonts/Menlo.ttc"

BG = "#F5F2E9"
INK = "#171816"
BLUE = "#BFD5F5"
BLUE_DARK = "#5E7EAE"
GREEN = "#91BFA6"
MUTED = "#777870"


def font(path: str, size: int, index: int = 0) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size, index=index)


def crop_pose(name: str) -> Image.Image:
    image = Image.open(ROOT / "assets" / name).convert("RGBA")
    bbox = image.getbbox()
    if bbox is None:
        raise ValueError(f"Empty pose: {name}")
    return image.crop(bbox)


def contain(image: Image.Image, max_w: int, max_h: int) -> Image.Image:
    ratio = min(max_w / image.width, max_h / image.height)
    return image.resize((round(image.width * ratio), round(image.height * ratio)), Image.Resampling.LANCZOS)


def paste_center(canvas: Image.Image, image: Image.Image, cx: int, top: int) -> None:
    canvas.alpha_composite(image, (cx - image.width // 2, top))


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius, fill=255)
    return mask


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    canvas = Image.new("RGBA", CANVAS, BG)
    draw = ImageDraw.Draw(canvas)

    # Quiet editorial texture and one precise brand signal.
    for y in range(18, CANVAS[1], 22):
        for x in range(18 + (y // 22 % 2) * 11, CANVAS[0], 22):
            draw.ellipse((x, y, x + 1, y + 1), fill="#DED9CC")

    draw.ellipse((78, 70, 94, 86), fill="#4B78D1")
    draw.text((110, 62), "CODEX DESKTOP PET", font=font(FONT_MONO, 25), fill=MUTED)

    title_font = font(FONT_CN, 124, index=0)
    draw.text((72, 115), "园丁，", font=title_font, fill=INK, stroke_width=1)
    draw.text((72, 245), "陪你写代码", font=font(FONT_CN, 92), fill=INK)

    # Codex-like stage.
    wx, wy, ww, wh = 90, 405, 900, 500
    shadow = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle((wx + 8, wy + 12, wx + ww + 8, wy + wh + 12), 36, fill=(32, 47, 67, 35))
    shadow = shadow.filter(ImageFilter.GaussianBlur(14))
    canvas.alpha_composite(shadow)
    draw.rounded_rectangle((wx, wy, wx + ww, wy + wh), 34, fill=BLUE, outline=BLUE_DARK, width=3)
    draw.line((wx, wy + 64, wx + ww, wy + 64), fill=BLUE_DARK, width=3)
    for i, color in enumerate(("#6F8EB8", "#86A1C4", "#9BB2CF")):
        draw.ellipse((wx + 30 + i * 28, wy + 25, wx + 42 + i * 28, wy + 37), fill=color)
    draw.text((wx + ww - 105, wy + 23), "CODEX", font=font(FONT_MONO, 18), fill=BLUE_DARK)

    sidebar_w = 155
    draw.line((wx + sidebar_w, wy + 64, wx + sidebar_w, wy + wh), fill=BLUE_DARK, width=2)
    for i, width in enumerate((56, 38, 62, 48)):
        yy = wy + 112 + i * 54
        draw.rounded_rectangle((wx + 34, yy, wx + 34 + width, yy + 10), 5, fill="#6B8DBD")
    for i, width in enumerate((285, 220, 255)):
        yy = wy + 110 + i * 50
        draw.rounded_rectangle((wx + sidebar_w + 48, yy, wx + sidebar_w + 48 + width, yy + 12), 6, fill="#6B8DBD")
    draw.rounded_rectangle((wx + ww - 190, wy + 107, wx + ww - 55, wy + 148), 20, fill="#EAF1FA")
    draw.text((wx + ww - 166, wy + 114), "WORKING", font=font(FONT_MONO, 19), fill="#4F6F9D")

    hero = contain(crop_pose("gardener-working.png"), 445, 405)
    paste_center(canvas, hero, wx + 555, wy + 80)

    # Three task states, treated as one compact information band.
    states = [
        ("待机", "IDLE", "gardener-idle.png"),
        ("任务中", "WORKING", "gardener-working.png"),
        ("已完成", "DONE", "gardener-complete.png"),
    ]
    card_y, card_h, card_w, gap = 950, 242, 270, 26
    start_x = (CANVAS[0] - (card_w * 3 + gap * 2)) // 2
    for idx, (cn, en, asset) in enumerate(states):
        x = start_x + idx * (card_w + gap)
        fill = "#FFFFFF" if idx != 1 else "#EDF4FF"
        outline = "#D8D4CA" if idx != 1 else "#5F88CE"
        draw.rounded_rectangle((x, card_y, x + card_w, card_y + card_h), 26, fill=fill, outline=outline, width=3)
        pose = contain(crop_pose(asset), 160, 148)
        paste_center(canvas, pose, x + card_w // 2, card_y + 12)
        draw.text((x + card_w // 2, card_y + 169), cn, font=font(FONT_CN, 32), anchor="ma", fill=INK)
        draw.text((x + card_w // 2, card_y + 213), en, font=font(FONT_MONO, 18), anchor="mm", fill=MUTED)

    # The command is the CTA itself.
    pill = (62, 1250, 1018, 1350)
    draw.rounded_rectangle(pill, 50, fill="#171816")
    command = "复制一行 · 自动安装"
    draw.text((540, 1300), command, font=font(FONT_CN, 38), anchor="mm", fill="#FFFFFF")

    result = canvas.convert("RGB")
    result.save(OUT / "gardener-codex-pet-poster.png", quality=96)
    print(OUT / "gardener-codex-pet-poster.png")


if __name__ == "__main__":
    main()
