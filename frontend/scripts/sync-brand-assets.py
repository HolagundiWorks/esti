#!/usr/bin/env python3
"""Copy ESTI/AORMS logo masters from docs/esti/assets/brand/ into frontend/public/."""

from __future__ import annotations

import shutil
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
LR = ROOT / "docs" / "esti" / "assets" / "brand"
PUB = ROOT / "frontend" / "public"
ESTI_BLUE = (15, 98, 254, 255)
AORMS_ORANGE = (255, 79, 24, 255)
WHITE = (255, 255, 255, 255)
AORMS_MARK = "aorms-mark.png"


def trim_alpha(im: Image.Image, pad: int = 4) -> Image.Image:
    arr = np.array(im.convert("RGBA"))
    mask = arr[:, :, 3] > 10
    if not mask.any():
        return im
    ys, xs = np.where(mask)
    y0, y1 = max(0, ys.min() - pad), min(arr.shape[0], ys.max() + pad + 1)
    x0, x1 = max(0, xs.min() - pad), min(arr.shape[1], xs.max() + pad + 1)
    return im.crop((x0, y0, x1, y1))


def drop_near_black(im: Image.Image) -> Image.Image:
    arr = np.array(im.convert("RGBA"))
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    bg = (r < 20) & (g < 20) & (b < 20) & (a > 180)
    arr[bg, 3] = 0
    return Image.fromarray(arr)


def drop_near_white(im: Image.Image) -> Image.Image:
    arr = np.array(im.convert("RGBA"))
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    bg = (r > 240) & (g > 240) & (b > 240)
    arr[bg, 3] = 0
    return Image.fromarray(arr)


def flood_remove_black_background(im: Image.Image) -> Image.Image:
    """Remove edge-connected black matte; keep black letterforms (aorms black.png)."""
    arr = np.array(im.convert("RGBA"))
    h, w = arr.shape[:2]
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    is_black = (r < 15) & (g < 15) & (b < 15) & (a > 128)
    bg = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_black[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if is_black[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and is_black[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True
                q.append((ny, nx))
    arr[bg, 3] = 0
    return Image.fromarray(arr)


def aorms_light_wordmark(src: Path, dest: Path) -> None:
    trim_alpha(flood_remove_black_background(Image.open(src)), pad=8).save(dest)


def aorms_white_wordmark(src: Path, dest: Path) -> None:
    """Solid white wordmark on transparent background (black header/footer)."""
    arr = np.array(Image.open(src).convert("RGBA"))
    logo = arr[:, :, 3] > 32
    arr[logo, 0] = 255
    arr[logo, 1] = 255
    arr[logo, 2] = 255
    arr[logo, 3] = 255
    arr[~logo, 3] = 0
    trim_alpha(Image.fromarray(arr), pad=8).save(dest)


def _wordmark_glyph_groups(wordmark: Image.Image) -> list[tuple[int, int]]:
    """Column runs of opaque pixels in a trimmed AORMS wordmark (a · o · r · m · s)."""
    arr = np.array(wordmark.convert("RGBA"))
    mask = arr[:, :, 3] > 10
    counts = mask.sum(axis=0)
    groups: list[tuple[int, int]] = []
    in_letter = False
    start = 0
    for x, count in enumerate(counts):
        if count > 3:
            if not in_letter:
                start = x
                in_letter = True
        elif in_letter:
            groups.append((start, x))
            in_letter = False
    if in_letter:
        groups.append((start, wordmark.width))
    return groups


def aorms_mark_silhouette(im: Image.Image) -> Image.Image:
    """Black silhouette on transparent — CSS mask source (same law as esti-mark-black)."""
    arr = np.array(im.convert("RGBA"))
    logo = arr[:, :, 3] > 10
    arr[:, :, 0] = 0
    arr[:, :, 1] = 0
    arr[:, :, 2] = 0
    arr[:, :, 3] = np.where(logo, 255, 0)
    return trim_alpha(Image.fromarray(arr), pad=4)


def extract_aorms_mark(wordmark: Image.Image) -> Image.Image:
    """Isolate the first letter ('a') from the AORMS typography wordmark."""
    groups = _wordmark_glyph_groups(wordmark)
    if not groups:
        raise ValueError("No glyphs found in AORMS wordmark")
    x0, x1 = groups[0]
    pad = 4
    crop = wordmark.crop(
        (max(0, x0 - pad), 0, min(wordmark.width, x1 + pad), wordmark.height)
    )
    return aorms_mark_silhouette(crop)


def make_aorms_badge(size: int, bg: tuple[int, int, int, int], fg: tuple[int, int, int, int]) -> Image.Image:
    mark = Image.open(PUB / AORMS_MARK).convert("RGBA")
    mark_arr = np.array(mark)
    glyph = mark_arr[:, :, 3] > 10
    mark_arr[glyph, 0] = fg[0]
    mark_arr[glyph, 1] = fg[1]
    mark_arr[glyph, 2] = fg[2]
    mark_arr[glyph, 3] = 255
    mark = Image.fromarray(mark_arr)
    canvas = Image.new("RGBA", (size, size), bg)
    target = int(size * 0.72)
    mark.thumbnail((target, target), Image.Resampling.LANCZOS)
    canvas.alpha_composite(mark, ((size - mark.width) // 2, (size - mark.height) // 2))
    return canvas


def favicon_sizes() -> None:
    frame = make_aorms_badge(512, AORMS_ORANGE, WHITE)
    for size, name in [
        (16, "favicon-16x16.png"),
        (32, "favicon-32x32.png"),
        (48, "favicon-48x48.png"),
        (180, "apple-touch-icon.png"),
        (192, "android-chrome-192x192.png"),
        (512, "android-chrome-512x512.png"),
    ]:
        frame.resize((size, size), Image.Resampling.LANCZOS).save(PUB / name)
    frame.resize((32, 32), Image.Resampling.LANCZOS).save(PUB / "favicon.ico", sizes=[(16, 16), (32, 32)])


def make_esti_badge(size: int, bg: tuple[int, int, int, int], fg: tuple[int, int, int, int]) -> Image.Image:
    src = Image.open(LR / "etsi black.png").convert("RGBA")
    arr = np.array(src)
    mask = arr[:, :, 3] > 10
    ys, xs = np.where(mask)
    mark = src.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    mark_arr = np.array(mark.convert("RGBA"))
    mark_mask = mark_arr[:, :, 3] > 10
    mark_arr[:, :, 0] = fg[0]
    mark_arr[:, :, 1] = fg[1]
    mark_arr[:, :, 2] = fg[2]
    mark_arr[:, :, 3] = np.where(mark_mask, fg[3], 0)
    mark = Image.fromarray(mark_arr)
    canvas = Image.new("RGBA", (size, size), bg)
    target = int(size * 0.76)
    mark.thumbnail((target, target), Image.Resampling.LANCZOS)
    canvas.alpha_composite(mark, ((size - mark.width) // 2, (size - mark.height) // 2))
    return canvas


def main() -> None:
    if not LR.is_dir():
        raise SystemExit(
            f"Brand source folder missing: {LR}\n"
            "Place logo masters there (see docs/esti/assets/brand/README.md)."
        )
    PUB.mkdir(parents=True, exist_ok=True)
    make_esti_badge(512, ESTI_BLUE, WHITE).save(PUB / "esti-logo.png")
    make_esti_badge(512, WHITE, ESTI_BLUE).save(PUB / "esti-logo-inverted.png")
    trim_alpha(drop_near_black(Image.open(LR / "etsi white colour.png"))).save(
        PUB / "esti-mark-white.png"
    )
    trim_alpha(drop_near_white(Image.open(LR / "etsi wb.png"))).save(
        PUB / "esti-mark-black.png"
    )
    aorms_wordmark = trim_alpha(
        flood_remove_black_background(Image.open(LR / "aorms black.png")), pad=8
    )
    aorms_wordmark.save(PUB / "aorms-logo.png")
    extract_aorms_mark(aorms_wordmark).save(PUB / AORMS_MARK)
    aorms_white_wordmark(LR / "aorms white.png", PUB / "aorms-logo-white.png")
    trim_alpha(Image.open(LR / "esticad logo.png")).save(PUB / "esticad-logo.png")
    shutil.copy2(LR / "hcw black.png", PUB / "hcw-black.png")
    shutil.copy2(LR / "HCW white.png", PUB / "hcw-white.png")
    favicon_sizes()
    print(f"Synced brand assets to {PUB}")


if __name__ == "__main__":
    main()
