#!/usr/bin/env python3
"""Build three dialogue cards in the established Gardener launch-poster style."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "poster" / "gardener-dialogues"
W, H = 1080, 1440

FONT_CN = "/System/Library/Fonts/Hiragino Sans GB.ttc"
FONT_MONO = "/System/Library/Fonts/Menlo.ttc"

BG = "#F5F2E9"
INK = "#171816"
MUTED = "#74766F"
BLUE = "#BFD5F5"
BLUE_DARK = "#5E7EAE"
MINT = "#DCEDE3"
PINK = "#F5DFDE"
CREAM = "#F7E9CD"
WHITE = "#FFFEFA"

CARDS = [
    {
        "filename": "01-idle-dialogues.png",
        "asset": "gardener-idle.png",
        "number": "01 / 03",
        "title": "待机时，",
        "subtitle": "她会说……",
        "state_en": "IDLE",
        "state_cn": "待机",
        "accent": MINT,
        "lines": [
            "花园需要耐心，任务也是。",
            "工具箱已经准备好了，\n今天要修整什么呢？",
            "嘘……你听见花开的声音了吗？",
            "休息一会儿也没关系，\n我会陪着你的。",
            "旧名字留在过去就好。\n现在，请叫我艾玛。",
            "火焰会留下痕迹，\n但花园总会重新发芽。",
            "如果椅子坏掉了，\n大家是不是就能安全一点？",
        ],
    },
    {
        "filename": "02-working-dialogues.png",
        "asset": "gardener-working.png",
        "number": "02 / 03",
        "title": "任务中，",
        "subtitle": "她在陪你",
        "state_en": "WORKING",
        "state_cn": "任务进行中",
        "accent": BLUE,
        "lines": [
            "专心一点，我会替你留意四周。",
            "像修整花圃一样，\n一点一点来就好。",
            "别担心，工具箱里总能找到办法。",
            "这一小步，\n也在让荒地变成花园。",
            "艾玛正在认真工作，\n你也要加油呀。",
        ],
    },
    {
        "filename": "03-complete-dialogues.png",
        "asset": "gardener-complete.png",
        "number": "03 / 03",
        "title": "任务完成，",
        "subtitle": "努力开花",
        "state_en": "DONE",
        "state_cn": "已完成",
        "accent": MINT,
        "lines": [
            "完成啦！这一朵小花\n送给认真工作的你。",
            "今天的花园也被照顾得很好。",
            "做得漂亮！现在可以\n安心休息一下了。",
            "看，努力已经开花了。",
            "任务安全送达——\n我们配合得真好！",
        ],
    },
]


def cn(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_CN, size)


def mono(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_MONO, size)


def pose(filename: str, max_w: int, max_h: int) -> Image.Image:
    image = Image.open(ROOT / "assets" / filename).convert("RGBA")
    bbox = image.getbbox()
    if bbox is None:
        raise ValueError(f"Empty asset: {filename}")
    image = image.crop(bbox)
    ratio = min(max_w / image.width, max_h / image.height)
    return image.resize((round(image.width * ratio), round(image.height * ratio)), Image.Resampling.LANCZOS)


def center_text(draw: ImageDraw.ImageDraw, box, text: str, text_font, fill=INK, spacing=10) -> None:
    x0, y0, x1, y1 = box
    bbox = draw.multiline_textbbox((0, 0), text, font=text_font, spacing=spacing, align="center")
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.multiline_text(
        ((x0 + x1) / 2 - tw / 2, (y0 + y1) / 2 - th / 2 - bbox[1]),
        text,
        font=text_font,
        fill=fill,
        spacing=spacing,
        align="center",
    )


def draw_card(config: dict) -> Image.Image:
    image = Image.new("RGBA", (W, H), BG)
    draw = ImageDraw.Draw(image)

    for y in range(18, H, 22):
        for x in range(18 + (y // 22 % 2) * 11, W, 22):
            draw.ellipse((x, y, x + 1, y + 1), fill="#DED9CC")

    draw.ellipse((76, 62, 92, 78), fill="#4B78D1")
    draw.text((108, 54), "CODEX DESKTOP PET", font=mono(25), fill=MUTED)
    draw.text((938, 57), config["number"], font=mono(20), fill=MUTED)

    draw.text((70, 112), config["title"], font=cn(90), fill=INK)
    draw.text((70, 208), config["subtitle"], font=cn(72), fill=INK)

    # Simple Codex-like state stage, matching the launch poster.
    sx, sy, sw, sh = 70, 320, 940, 300
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((sx + 7, sy + 10, sx + sw + 7, sy + sh + 10), 30, fill=(40, 50, 65, 32))
    image.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(12)))
    draw.rounded_rectangle((sx, sy, sx + sw, sy + sh), 30, fill="#D7E4F7", outline=BLUE_DARK, width=3)
    draw.line((sx, sy + 52, sx + sw, sy + 52), fill=BLUE_DARK, width=3)
    for i in range(3):
        draw.ellipse((sx + 28 + i * 26, sy + 20, sx + 39 + i * 26, sy + 31), fill="#83A0C7")
    draw.text((sx + sw - 95, sy + 18), "CODEX", font=mono(17), fill=BLUE_DARK)

    character = pose(config["asset"], 290, 225)
    image.alpha_composite(character, (sx + 94, sy + 65))
    pill = (sx + 455, sy + 104, sx + 846, sy + 198)
    draw.rounded_rectangle(pill, 47, fill=config["accent"], outline=BLUE_DARK, width=2)
    pill_cx = (pill[0] + pill[2]) // 2
    pill_cy = (pill[1] + pill[3]) // 2
    draw.text((pill_cx - 62, pill_cy), config["state_en"], font=mono(25), anchor="mm", fill="#45658E")
    draw.text((pill_cx + 86, pill_cy - 1), f'·  {config["state_cn"]}', font=cn(24), anchor="mm", fill="#45658E")

    # Dialogue region: two-column modular cards, deliberately simpler than comic bubbles.
    lines = config["lines"]
    cols = 2
    rows = (len(lines) + cols - 1) // cols
    region_top, region_bottom = 660, 1362
    gap_x, gap_y = 22, 20
    left, right = 70, 1010
    box_w = (right - left - gap_x) // 2
    box_h = (region_bottom - region_top - gap_y * (rows - 1)) // rows
    fills = (WHITE, config["accent"], PINK, CREAM)

    for index, text in enumerate(lines):
        row, col = divmod(index, cols)
        if index == len(lines) - 1 and len(lines) % 2 == 1:
            x0, x1 = left + 126, right - 126
        else:
            x0 = left + col * (box_w + gap_x)
            x1 = x0 + box_w
        y0 = region_top + row * (box_h + gap_y)
        y1 = y0 + box_h
        draw.rounded_rectangle((x0, y0, x1, y1), 24, fill=fills[index % len(fills)], outline="#C9C5BC", width=2)
        # One small speech-tail cue, without adding decorative clutter.
        draw.polygon(((x0 + 36, y1 - 2), (x0 + 55, y1 + 12), (x0 + 72, y1 - 2)), fill=fills[index % len(fills)])
        text_size = 27 if len(lines) == 7 else 31
        center_text(draw, (x0 + 18, y0 + 12, x1 - 18, y1 - 12), text, cn(text_size), spacing=9)

    return image.convert("RGB")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for config in CARDS:
        path = OUT / config["filename"]
        draw_card(config).save(path, quality=96)
        print(path)


if __name__ == "__main__":
    main()
