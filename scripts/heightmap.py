#!/usr/bin/env python3
#
# @file    heightmap.py
# @author  Sebastien LEGRAND
#
# @brief   Generate the height map of the ts-bump effect: white text on black (640x480)
#
#          Usage: python3 scripts/heightmap.py ["Some text"]
#          Needs Pillow (pip install pillow). The font is downloaded once into tmp/.
#

# ----- imports
import os
import sys
import urllib.request

from PIL import Image, ImageDraw, ImageFont

# ----- globals
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

FONT_URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/freckleface/FreckleFace-Regular.ttf"
FONT_FILE = os.path.join(ROOT, "tmp", "FreckleFace-Regular.ttf")
OUTPUT = os.path.join(ROOT, "files", "effects", "ts-bump", "assets", "heightmap.png")

WIDTH, HEIGHT = 640, 480
MARGIN = 40  # minimum space between the text and the screen borders
LINE_GAP = 10  # space between two lines of text
DEFAULT_TEXT = "Bump\nMapping"


# ----- functions
def font_file() -> str:
    """download the font once"""
    if not os.path.exists(FONT_FILE):
        os.makedirs(os.path.dirname(FONT_FILE), exist_ok=True)
        print(f"downloading {FONT_URL}")
        urllib.request.urlretrieve(FONT_URL, FONT_FILE)
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
    font = fit(draw, text)

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
