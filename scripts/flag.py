#!/usr/bin/env python3
#
# @file    flag.py
# @author  Sebastien LEGRAND
#
# @brief   Generate the texture of the ts-flag effect: the flag of Canada (256x256)
#
#          Usage: python3 scripts/flag.py
#          Needs Pillow (pip install pillow; generated with Pillow 12.1.1).
#
#          The flag is 2:1: red bands of 1/4 of the width on each side, a white square in the
#          middle and the 11-point red maple leaf. The leaf outline is the path of the Wikimedia
#          "Flag of Canada (Pantone).svg" (viewBox 9600 x 4800, public domain): straight lines and
#          small rounded corners (arcs). The flag is drawn 4x larger then reduced (smooth edges),
#          and squeezed into a 256x256 square: stretched on the 2:1 cloth, it gets its shape back.
#

# ----- imports
import math
import os
import re

from PIL import Image, ImageDraw

# ----- globals
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT = os.path.join(ROOT, "files", "effects", "ts-flag", "assets", "flag.png")

SIZE = 256  # texture size
WIDTH, HEIGHT = 4096, 2048  # drawing size (2:1)
VIEW_W = 9600  # SVG viewBox width (height 4800)

RED = (0xD5, 0x2B, 0x1E)  # official FIP red
WHITE = (255, 255, 255)

# maple leaf outline (relative SVG path commands, starting at the bottom right of the stem)
LEAF = (
    "m4890 4430-45-863a95 95 0 0 1 111-98l859 151-116-320a65 65 0 0 1 20-73l941-762-212-99"
    "a65 65 0 0 1-34-79l186-572-542 115a65 65 0 0 1-73-38l-105-247-423 454a65 65 0 0 1-111-57"
    "l204-1052-327 189a65 65 0 0 1-91-27l-332-652-332 652a65 65 0 0 1-91 27l-327-189 204 1052"
    "a65 65 0 0 1-111 57l-423-454-105 247a65 65 0 0 1-73 38l-542-115 186 572a65 65 0 0 1-34 79"
    "l-212 99 941 762a65 65 0 0 1 20 73l-116 320 859-151a95 95 0 0 1 111 98l-45 863z"
)
ARC_STEPS = 8  # points per rounded corner


# ----- functions
def arc(x1, y1, rx, ry, sweep, x2, y2):
    """points of a circular SVG arc from (x1, y1) to (x2, y2), small arc, endpoint excluded"""
    r = rx  # the leaf arcs are circular (rx == ry)
    mx, my = (x2 - x1) / 2, (y2 - y1) / 2
    d = math.hypot(mx, my)
    r = max(r, d)
    h = math.sqrt(r * r - d * d)

    # centre on the side given by the sweep flag (small arc)
    nx, ny = -my / d, mx / d
    sign = 1 if sweep else -1
    cx, cy = x1 + mx + sign * h * nx, y1 + my + sign * h * ny

    a1 = math.atan2(y1 - cy, x1 - cx)
    a2 = math.atan2(y2 - cy, x2 - cx)
    da = a2 - a1
    if sweep and da < 0:
        da += 2 * math.pi
    if not sweep and da > 0:
        da -= 2 * math.pi
    return [(cx + r * math.cos(a1 + da * i / ARC_STEPS), cy + r * math.sin(a1 + da * i / ARC_STEPS)) for i in range(ARC_STEPS)]


def leaf_polygon():
    """the leaf outline as a list of points (SVG viewBox units)"""
    tokens = re.findall(r"[a-zA-Z]|-?\d+(?:\.\d+)?", LEAF)
    points = []
    x = y = 0.0
    cmd = None
    i = 0
    while i < len(tokens):
        if tokens[i].isalpha():
            cmd = tokens[i]
            i += 1
            if cmd == "z":
                break
            continue
        if cmd == "m":
            x, y = x + float(tokens[i]), y + float(tokens[i + 1])
            points.append((x, y))
            cmd = "l"  # implicit lineto after moveto
            i += 2
        elif cmd == "l":
            x, y = x + float(tokens[i]), y + float(tokens[i + 1])
            points.append((x, y))
            i += 2
        elif cmd == "a":
            rx, ry, sweep = float(tokens[i]), float(tokens[i + 1]), tokens[i + 4] == "1"
            nx, ny = x + float(tokens[i + 5]), y + float(tokens[i + 6])
            points.pop()  # the arc starts at the current point
            points.extend(arc(x, y, rx, ry, sweep, nx, ny))
            points.append((nx, ny))
            x, y = nx, ny
            i += 7
        else:
            raise ValueError(f"unsupported command {cmd}")
    return points


def main() -> None:
    k = WIDTH / VIEW_W
    image = Image.new("RGB", (WIDTH, HEIGHT), RED)
    draw = ImageDraw.Draw(image)
    draw.rectangle([WIDTH // 4, 0, WIDTH * 3 // 4 - 1, HEIGHT - 1], fill=WHITE)
    draw.polygon([(px * k, py * k) for px, py in leaf_polygon()], fill=RED)

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    image.resize((SIZE, SIZE), Image.LANCZOS).save(OUTPUT, optimize=True)
    print(f"{OUTPUT} ({WIDTH}x{HEIGHT} -> {SIZE}x{SIZE})")


# ----- begin
if __name__ == "__main__":
    main()
