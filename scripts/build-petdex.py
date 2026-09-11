#!/usr/bin/env python3
"""Build the Gardener Petdex atlas from the three approved transparent poses."""

from pathlib import Path
import json
import shutil
import zipfile

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
OUT = ROOT / "petdex" / "gardener-codexpet"
PREVIEW = ROOT / "preview" / "gardener-petdex-states.png"

FRAME_W = 192
FRAME_H = 208
COLS = 8
ROWS = 9
ART_MAX_W = 184
ART_MAX_H = 184

STATE_ROWS = [
    ("Idle", "gardener-idle.png", False, [0, 1, 0, -1, 0, 1, 0, -1]),
    ("Run Right", "gardener-working.png", False, [1, -1, 0, -2, 1, -1, 0, -2]),
    ("Run Left", "gardener-working.png", True, [1, -1, 0, -2, 1, -1, 0, -2]),
    ("Waving", "gardener-complete.png", False, [0, -2, 0, 1, 0, -2, 0, 1]),
    ("Jumping", "gardener-complete.png", False, [0, -4, -10, -15, -10, -4, 0, 0]),
    ("Failed", "gardener-working.png", False, [0, 1, 2, 1, 0, 1, 2, 1]),
    ("Waiting", "gardener-idle.png", False, [0, 0, -1, -1, 0, 0, 1, 1]),
    ("Running", "gardener-working.png", False, [1, -2, 0, -3, 1, -2, 0, -3]),
    ("Review", "gardener-complete.png", False, [0, -1, 0, 1, 0, -1, 0, 1]),
]


def prepare_pose(filename: str, flip: bool) -> Image.Image:
    source = Image.open(ASSETS / filename).convert("RGBA")
    bbox = source.getbbox()
    if bbox is None:
        raise ValueError(f"No visible pixels in {filename}")
    source = source.crop(bbox)
    scale = min(ART_MAX_W / source.width, ART_MAX_H / source.height)
    size = (round(source.width * scale), round(source.height * scale))
    source = source.resize(size, Image.Resampling.LANCZOS)
    if flip:
        source = source.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    return source


def paste_frame(atlas: Image.Image, pose: Image.Image, col: int, row: int, dy: int) -> None:
    # Keep every state on one visual baseline; subtle offsets give static poses life.
    x = col * FRAME_W + (FRAME_W - pose.width) // 2
    y = row * FRAME_H + FRAME_H - pose.height - 8 + dy
    atlas.alpha_composite(pose, (x, y))


def build_preview(atlas: Image.Image) -> Image.Image:
    scale = 0.68
    cell_w = round(FRAME_W * scale)
    cell_h = round(FRAME_H * scale)
    label_w = 156
    margin = 24
    canvas = Image.new(
        "RGB",
        (margin * 2 + label_w + cell_w * COLS, margin * 2 + cell_h * ROWS),
        "#f7f4ec",
    )
    draw = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 20)
        small = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 13)
    except OSError:
        font = ImageFont.load_default()
        small = font

    for row, (name, *_rest) in enumerate(STATE_ROWS):
        top = margin + row * cell_h
        draw.text((margin, top + 46), name, font=font, fill="#25231f")
        draw.text((margin, top + 72), f"row {row}", font=small, fill="#777167")
        for col in range(COLS):
            left = margin + label_w + col * cell_w
            tile_color = "#e9e6df" if (row + col) % 2 == 0 else "#ffffff"
            draw.rectangle((left, top, left + cell_w, top + cell_h), fill=tile_color)
            crop = atlas.crop(
                (col * FRAME_W, row * FRAME_H, (col + 1) * FRAME_W, (row + 1) * FRAME_H)
            ).resize((cell_w, cell_h), Image.Resampling.LANCZOS)
            canvas.paste(crop, (left, top), crop)
    return canvas


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    PREVIEW.parent.mkdir(parents=True, exist_ok=True)

    atlas = Image.new("RGBA", (FRAME_W * COLS, FRAME_H * ROWS), (0, 0, 0, 0))
    for row, (_name, filename, flip, offsets) in enumerate(STATE_ROWS):
        pose = prepare_pose(filename, flip)
        for col, dy in enumerate(offsets):
            paste_frame(atlas, pose, col, row, dy)

    atlas_path = OUT / "spritesheet.png"
    atlas.save(atlas_path, optimize=True)

    metadata = {
        "id": "gardener-codexpet",
        "displayName": "园丁 · 艾玛·伍兹",
        "description": "非官方《第五人格》园丁艾玛·伍兹 Codex 同人桌宠，包含待机、工作、完成、等待、失败与审核反应。",
        "spriteVersionNumber": 1,
        "spritesheetPath": "spritesheet.png",
    }
    (OUT / "pet.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    build_preview(atlas).save(PREVIEW, optimize=True)

    zip_path = ROOT / "petdex" / "gardener-codexpet.zip"
    if zip_path.exists():
        zip_path.unlink()
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        archive.write(OUT / "pet.json", "pet.json")
        archive.write(atlas_path, "spritesheet.png")

    print(atlas_path)
    print(PREVIEW)
    print(zip_path)


if __name__ == "__main__":
    main()
