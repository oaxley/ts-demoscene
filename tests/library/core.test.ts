/*
 * @file    core.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Unit tests for the library core helpers (surface, palette, bresenham)
 */

//----- imports
import { describe, test, expect } from "vitest";

import { Surface } from "library/gfx/surface";
import { Font } from "library/gfx/font";
import { bresenham } from "library/gfx/bresenham";
import { Palette } from "library/color/palette";
import { Color } from "library/color/color";
import { COLOR_MODEL } from "library/color/basecolor";
import { RGBA } from "library/color/RGBA";
import { TrigTables } from "library/maths/projection";

//----- helpers
function points(x1: number, y1: number, x2: number, y2: number): string {
    const out: string[] = [];
    bresenham({ x: x1, y: y1 }, { x: x2, y: y2 }, (x, y) => out.push(`${x},${y}`));
    return out.join(" ");
}

//----- tests
describe("bresenham", () => {
    test("single point", () => {
        expect(points(3, 4, 3, 4)).toBe("3,4");
    });

    test("horizontal, vertical and diagonal lines include both ends", () => {
        expect(points(0, 0, 3, 0)).toBe("0,0 1,0 2,0 3,0");
        expect(points(0, 2, 0, 0)).toBe("0,2 0,1 0,0");
        expect(points(0, 0, -2, -2)).toBe("0,0 -1,-1 -2,-2");
    });

    test("shallow line", () => {
        expect(points(0, 0, 4, 2)).toBe("0,0 1,1 2,1 3,2 4,2");
    });
});

describe("Surface", () => {
    test("imageData shares the framebuffer", () => {
        const s = new Surface({ width: 4, height: 2 });
        const img = s.imageData;
        s.data32[5] = 0x11223344;
        expect(Array.from(img.data.slice(20, 24))).toEqual([0x44, 0x33, 0x22, 0x11]);
        expect(s.imageData).toBe(img);
    });

    test("image getter returns a copy", () => {
        const s = new Surface({ width: 2, height: 2 });
        const img = s.image;
        s.data32[0] = 0xffffffff;
        expect(img.data[0]).toBe(0);
    });

    test("copy() reuses the framebuffer and keeps the size in sync", () => {
        const a = new Surface({ width: 3, height: 2 });
        const b = new Surface({ width: 3, height: 2 });
        a.data32.set([1, 2, 3, 4, 5, 6]);
        const before = b.data32;
        b.copy(a);
        expect(b.data32).toBe(before);
        expect(Array.from(b.data32)).toEqual([1, 2, 3, 4, 5, 6]);

        const c = new Surface();
        c.copy(a);
        expect(c.size).toEqual({ width: 3, height: 2 });
        expect(Array.from(c.data32)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    test("getImgBlock / putImgBlock round-trip", () => {
        const s = new Surface({ width: 4, height: 4 });
        s.data32.forEach((_, i) => (s.data32[i] = i + 1));
        const block = s.getImgBlock(1, 1, 2, 2);
        expect(Array.from(new Uint32Array(block.data.buffer))).toEqual([6, 7, 10, 11]);

        const d = new Surface({ width: 4, height: 4 });
        d.putImgBlock(block, 2, 0);
        expect(Array.from(d.data32)).toEqual([0, 0, 6, 7, 0, 0, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0]);
    });

    test("getImgBlock outside the framebuffer reads 0, putImgBlock ignores it", () => {
        const s = new Surface({ width: 2, height: 2 });
        s.data32.set([1, 2, 3, 4]);
        const block = s.getImgBlock(0, -1, 2, 2);
        expect(Array.from(new Uint32Array(block.data.buffer))).toEqual([0, 0, 1, 2]);

        s.putImgBlock(s.getImgBlock(0, 0, 2, 2), 0, 1);
        expect(Array.from(s.data32)).toEqual([1, 2, 1, 2]);
    });

    test("line() draws the bresenham points", () => {
        const s = new Surface({ width: 5, height: 3 });
        s.line({ x: 0, y: 0 }, { x: 4, y: 2 }, new RGBA(255, 0, 0));
        const lit = Array.from(s.data32)
            .map((v) => (v ? 1 : 0))
            .join("");
        expect(lit).toBe("10000" + "01100" + "00011");
    });
});

// RGBA.uint32 may be signed (see RGBA.toUInt32), the LUT stores the same bits unsigned
const u32 = (c: RGBA) => c.uint32 >>> 0;

describe("Palette.toUint32Array", () => {
    test("packs RGBA colors and is cached until the palette changes", () => {
        const p = new Palette();
        p.setColor(0, new Color(COLOR_MODEL.RGBA, 1, 2, 3));
        p.setColor(1, Color.from(new RGBA(255, 128, 0)));

        const lut = p.toUint32Array();
        expect(lut[0]).toBe(u32(new RGBA(1, 2, 3)));
        expect(lut[1]).toBe(u32(new RGBA(255, 128, 0)));
        expect(p.toUint32Array()).toBe(lut);

        p.setColor(1, new Color(COLOR_MODEL.RGBA, 0, 0, 0));
        expect(p.toUint32Array()).not.toBe(lut);
        expect(p.toUint32Array()[1]).toBe(u32(new RGBA(0, 0, 0)));
    });

    test("same values as getColor()", () => {
        const p = new Palette();
        p.gradient(new Color(COLOR_MODEL.RGBA, 0, 0, 0), new Color(COLOR_MODEL.RGBA, 255, 100, 50), 256);
        const lut = p.toUint32Array();
        for (let i = 0; i < 256; i++) {
            expect(lut[i]).toBe(u32(p.getColor(i)!.color as RGBA));
        }
    });
});

describe("TrigTables", () => {
    test("360 entries matching Math.cos / Math.sin", () => {
        const t = new TrigTables();
        expect(t.cos.length).toBe(360);
        expect(t.cos[0]).toBe(1);
        expect(t.sin[90]).toBe(Math.sin((90 * Math.PI) / 180));
    });
});

describe("Surface clipping", () => {
    const red = new RGBA(255, 0, 0);

    test("setPixel / line ignore pixels outside of the surface", () => {
        const s = new Surface({ width: 4, height: 3 });
        s.setPixel(4, 0, red); // would wrap on (0, 1)
        s.setPixel(-1, 1, red); // would wrap on (3, 0)
        s.setPixel(0, 3, red); // past the end
        expect(Array.from(s.data32).every((v) => v === 0)).toBe(true);

        s.line({ x: -2, y: 1 }, { x: 5, y: 1 }, red);
        expect(Array.from(s.data32).map((v) => (v ? 1 : 0))).toEqual([0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0]);
    });

    test("disc ignores pixels outside of the surface (no wrap)", () => {
        const s = new Surface({ width: 4, height: 3 });
        s.disc(-1, 1.5, 3, 0xffffffff);
        expect(s.data32[4]).toBe(0xffffffff); // (0,1) is fully inside the disc
        expect([s.data32[3], s.data32[7], s.data32[11]]).toEqual([0, 0, 0]); // right column untouched
        expect(s.data32.length).toBe(12);

        const r = new Surface({ width: 4, height: 3 });
        r.disc(4, 1.5, 3, 0xffffffff);
        expect(r.data32[7]).toBe(0xffffffff); // (3,1)
        expect([r.data32[0], r.data32[4], r.data32[8]]).toEqual([0, 0, 0]); // left column untouched

        const f = new Surface({ width: 4, height: 3 });
        f.disc(100, 100, 5, 0xffffffff);
        f.disc(-50, -50, 5, 0xffffffff);
        expect(Array.from(f.data32).every((v) => v === 0)).toBe(true);
    });

    test("readBlock / writeBlock clip the block", () => {
        const s = new Surface({ width: 3, height: 2 });
        s.data32.set([1, 2, 3, 4, 5, 6]);

        const out = new Uint32Array(4);
        s.readBlock(2, 0, 2, 2, out);
        expect(Array.from(out)).toEqual([3, 0, 6, 0]);

        s.writeBlock(new Uint32Array([7, 8, 9, 10]), -1, 1, 2, 2);
        expect(Array.from(s.data32)).toEqual([1, 2, 3, 8, 5, 6]);
    });

    test("writeBlock skips the mask pixels (transparent colour)", () => {
        const s = new Surface({ width: 3, height: 2 });
        s.data32.set([1, 2, 3, 4, 5, 6]);

        // inside the surface (fast path without mask)
        s.writeBlock(new Uint32Array([0, 7, 8, 0]), 0, 0, 2, 2, 0);
        expect(Array.from(s.data32)).toEqual([1, 7, 3, 8, 5, 6]);

        // clipped block
        s.writeBlock(new Uint32Array([9, 0, 0, 10]), 2, 0, 2, 2, 0);
        expect(Array.from(s.data32)).toEqual([1, 7, 9, 8, 5, 6]);
    });
});

describe("Surface.disc", () => {
    const WHITE = 0xffffffff;
    const BLACK = 0xff000000;
    const red = (v: number): number => v & 0xff;

    // 21x21 black surface
    const black = (): Surface => {
        const s = new Surface({ width: 21, height: 21 });
        s.data32.fill(BLACK);
        return s;
    };

    test("filled centre, soft edge inside the radius, nothing beyond", () => {
        const s = black();
        s.disc(10, 10, 6, WHITE);
        expect(s.data32[10 * 21 + 10] >>> 0).toBe(WHITE);
        // pixel (15,10): centre (15.5,10.5), d ~ 5.52, coverage ~ 0.48
        const edge = red(s.data32[10 * 21 + 15]);
        expect(edge).toBeGreaterThan(0);
        expect(edge).toBeLessThan(255);
        // beyond the radius
        expect(s.data32[17 * 21 + 10] >>> 0).toBe(BLACK);
        expect(s.data32[0] >>> 0).toBe(BLACK);
        // every pixel whose centre is farther than r stays black
        for (let y = 0; y < 21; y++) {
            for (let x = 0; x < 21; x++) {
                if (Math.hypot(x + 0.5 - 10, y + 0.5 - 10) >= 6) {
                    expect(s.data32[y * 21 + x] >>> 0).toBe(BLACK);
                }
            }
        }
    });

    test("alpha blends over the existing pixel", () => {
        const s = black();
        s.disc(10, 10, 6, new RGBA(255, 255, 255), 0.5);
        const c = red(s.data32[10 * 21 + 10]);
        expect(c).toBeGreaterThanOrEqual(127);
        expect(c).toBeLessThanOrEqual(128);
        expect(s.data32[10 * 21 + 10] >>> 24).toBe(255);
    });

    test("repeated stamps converge to the colour without overflow", () => {
        const s = black();
        for (let i = 0; i < 50; i++) {
            s.disc(10, 10, 6, WHITE, 0.3);
        }
        expect(s.data32[10 * 21 + 10] >>> 0).toBe(WHITE);
    });

    test("tiny radius still inks its pixel, nothing else, no NaN", () => {
        const s = black();
        s.disc(10.5, 10.5, 0.6, WHITE);
        const changed: number[] = [];
        s.data32.forEach((v, i) => {
            if (v >>> 0 !== BLACK) changed.push(i);
        });
        expect(changed).toEqual([10 * 21 + 10]);
        const c = red(s.data32[10 * 21 + 10]);
        expect(c).toBeGreaterThan(0);
        expect(Number.isNaN(c)).toBe(false);
    });
});

describe("Font.loaded", () => {
    test("resolves once the font map is loaded, glyphs are then available", async () => {
        const font = new Font("/images/assets/ts-scroller.font-map.png", { width: 32, height: 32 });
        expect(await font.loaded).toBe(true);
        const lit = font.getCharPixels("A").filter((p) => (p & 0xff) > 0).length;
        expect(lit).toBeGreaterThan(0);
    });

    test("resolves to false for a missing asset", async () => {
        const font = new Font("/images/assets/ts-scroller.nope.png", { width: 32, height: 32 });
        expect(await font.loaded).toBe(false);
    });
});
