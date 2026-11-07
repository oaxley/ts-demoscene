#!/usr/bin/env python3
#
# @file    heightmap.py
# @author  Sebastien LEGRAND
#
# @brief   Generate the height map of the ts-bump effect: white text on black (640x480)
#
#          Usage: python3 scripts/heightmap.py ["Some\nText"]   (a "\n" starts a new line)
#          Needs Pillow (pip install pillow; generated with Pillow 12.1.1).
#          The font is downloaded once into tmp/ (pinned version, checked by SHA-256).
#

# ----- imports
import hashlib
import os
import sys
import urllib.request

from PIL import Image, ImageDraw, ImageFont

# ----- globals
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

FONT_URL = (
    "https://raw.githubusercontent.com/google/fonts/"
    "90abd17b4f97671435798b6147b698aa9087612f/ofl/freckleface/FreckleFace-Regular.ttf"
)
FONT_SHA256 = "54b61a9f5bac3eb3a3d7f78f99d4d9c5d5688a9859e79bbf8704ae79c7f8f0fc"
FONT_FILE = os.path.join(ROOT, "tmp", "FreckleFace-Regular.ttf")
OUTPUT = os.path.join(ROOT, "files", "effects", "ts-bump", "assets", "heightmap.png")

WIDTH, HEIGHT = 640, 480
MARGIN = 40  # minimum space between the text and the screen borders
LINE_GAP = 10  # space between two lines of text
DEFAULT_TEXT = "Bump\nMapping"


# ----- functions
def sha256(file: str) -> str:
    with open(file, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def font_file() -> str:
    """download the font once (to a temporary file, renamed when complete and verified)"""
    if not os.path.exists(FONT_FILE) or sha256(FONT_FILE) != FONT_SHA256:
        os.makedirs(os.path.dirname(FONT_FILE), exist_ok=True)
        print(f"downloading {FONT_URL}")
        partial = FONT_FILE + ".part"
        urllib.request.urlretrieve(FONT_URL, partial)
        if sha256(partial) != FONT_SHA256:
            os.remove(partial)
            sys.exit("downloaded font does not match the expected SHA-256")
        os.replace(partial, FONT_FILE)
    return FONT_FILE


def fit(draw: ImageDraw.ImageDraw, text: str) -> ImageFont.FreeTypeFont:
    """largest font size where the text fits in the screen (minus the margins)"""
    for size in range(300, 10, -2):
        font = ImageFont.truetype(font_file(), size)
        left, top, right, bottom = draw.multiline_textbbox((0, 0), text, font=font, spacing=LINE_GAP, align="center")
        if right - left <= WIDTH - 2 * MARGIN and bottom - top <= HEIGHT - 2 * MARGIN:
            return font
    raise ValueError("text too long")


def main() -> None:
    text = sys.argv[1].replace("\\n", "\n") if len(sys.argv) > 1 else DEFAULT_TEXT

    image = Image.new("L", (WIDTH, HEIGHT), 0)
    draw = ImageDraw.Draw(image)
    try:
        font = fit(draw, text)
    except ValueError:
        sys.exit(f"text too long for {WIDTH}x{HEIGHT}: {text!r}")

    # center the text on the screen
    left, top, right, bottom = draw.multiline_textbbox((0, 0), text, font=font, spacing=LINE_GAP, align="center")
    x = (WIDTH - (right - left)) // 2 - left
    y = (HEIGHT - (bottom - top)) // 2 - top
    draw.multiline_text((x, y), text, fill=255, font=font, spacing=LINE_GAP, align="center")

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    image.convert("RGB").save(OUTPUT, optimize=True)
    print(f"{OUTPUT} ({font.size}px)")


# ----- begin
if __name__ == "__main__":
    main()
