/*
 * @file    core.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Unit tests for the library core helpers (surface, palette, bresenham)
 */

//----- imports
import { describe, test, expect } from "vitest";

import { Surface } from "library/gfx/surface";
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

    test("readBlock / writeBlock clip the block", () => {
        const s = new Surface({ width: 3, height: 2 });
        s.data32.set([1, 2, 3, 4, 5, 6]);

        const out = new Uint32Array(4);
        s.readBlock(2, 0, 2, 2, out);
        expect(Array.from(out)).toEqual([3, 0, 6, 0]);

        s.writeBlock(new Uint32Array([7, 8, 9, 10]), -1, 1, 2, 2);
        expect(Array.from(s.data32)).toEqual([1, 2, 3, 8, 5, 6]);
    });
});
