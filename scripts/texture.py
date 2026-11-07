#!/usr/bin/env python3
#
# @file    texture.py
# @author  Sebastien LEGRAND
#
# @brief   Generate the texture of the ts-cube effect: a picture centred on a white square (256x256)
#
#          Usage: python3 scripts/texture.py [source.png]   (default: tmp/chimps-3.png)
#          Needs Pillow (pip install pillow; generated with Pillow 12.1.1).
#          Transparent pixels of the source become white.
#

# ----- imports
import os
import sys

from PIL import Image

# ----- globals
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DEFAULT_SOURCE = os.path.join(ROOT, "tmp", "chimps-3.png")
OUTPUT = os.path.join(ROOT, "files", "effects", "ts-cube", "assets", "texture.png")

SIZE = 256
WHITE = (255, 255, 255, 255)


# ----- functions
def main() -> None:
    source = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SOURCE
    if not os.path.exists(source):
        sys.exit(f"source image not found: {source}")

    # flatten the transparency on a white background
    image = Image.open(source).convert("RGBA")
    image = Image.alpha_composite(Image.new("RGBA", image.size, WHITE), image)

    # pad to a white square, the image centred
    w, h = image.size
    side = max(w, h)
    square = Image.new("RGBA", (side, side), WHITE)
    square.paste(image, ((side - w) // 2, (side - h) // 2))

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    square.resize((SIZE, SIZE), Image.LANCZOS).convert("RGB").save(OUTPUT, optimize=True)
    print(f"{OUTPUT} ({w}x{h} -> {SIZE}x{SIZE})")


# ----- begin
if __name__ == "__main__":
    main()
