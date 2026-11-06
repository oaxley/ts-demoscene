/*
 * @file    color.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Unit tests for the color classes and the palette
 */

//----- imports
import { describe, test, expect } from "vitest";

import { RGBA } from "library/color/RGBA";
import { HSLA } from "library/color/HSLA";
import { HSVA } from "library/color/HSVA";
import { Color } from "library/color/color";
import { COLOR_MODEL } from "library/color/basecolor";
import { Palette } from "library/color/palette";

//----- tests
describe("RGBA", () => {
    test("css / hex", () => {
        const c = new RGBA(255, 128, 0);
        expect(c.css()).toBe("rgba(255, 128, 0, 255)");
        expect(c.hex()).toBe("#ff8000");
    });

    test("uint32 layout (same as Surface.data32)", () => {
        const c = new RGBA(0x11, 0x22, 0x33, 0x44);
        expect(c.uint32 >>> 0).toBe(0x44332211);

        const d = new RGBA();
        d.uint32 = 0xff332211;
        expect(d.array).toEqual([0x11, 0x22, 0x33, 0xff]);
    });

    test("fromUInt32 (opaque alpha below 0x80)", () => {
        expect(RGBA.fromUInt32(0x7f332211)).toEqual([0x11, 0x22, 0x33, 0x7f]);
    });
});

describe("color conversions", () => {
    const cases: Array<[number, number, number]> = [
        [255, 0, 0],
        [0, 255, 0],
        [0, 0, 255],
        [255, 255, 255],
        [0, 0, 0],
        [128, 64, 32],
    ];

    test.each(cases)("RGBA(%i, %i, %i) -> HSLA -> RGBA", (r, g, b) => {
        const hsla = HSLA.from(new RGBA(r, g, b))!;
        const back = RGBA.from(hsla)!;
        expect(back.red).toBeCloseTo(r, -0.5);
        expect(back.green).toBeCloseTo(g, -0.5);
        expect(back.blue).toBeCloseTo(b, -0.5);
    });

    test.each(cases)("RGBA(%i, %i, %i) -> HSVA -> RGBA", (r, g, b) => {
        const hsva = HSVA.from(new RGBA(r, g, b))!;
        const back = RGBA.from(hsva)!;
        expect(back.red).toBeCloseTo(r, -0.5);
        expect(back.green).toBeCloseTo(g, -0.5);
        expect(back.blue).toBeCloseTo(b, -0.5);
    });

    test("HSLA css uses percentages", () => {
        expect(new HSLA(120, 0.5, 0.25, 1).css()).toBe("hsla(120, 50%, 25%, 1)");
    });
});

describe("Palette bounds", () => {
    const palette = new Palette();
    palette.setColor(0, new Color(COLOR_MODEL.RGBA, 1, 2, 3));
    palette.setColor(1, new Color(COLOR_MODEL.RGBA, 4, 5, 6));

    test("getColor out of range", () => {
        expect(palette.getColor(1)).toBeDefined();
        expect(palette.getColor(2)).toBeUndefined();
        expect(palette.getColor(-1)).toBeUndefined();
    });

    test("swap out of range", () => {
        expect(() => palette.swap(0, 2)).toThrow(RangeError);
        expect(() => palette.swap(2, 0)).toThrow(RangeError);
        palette.swap(0, 1);
        expect((palette.getColor(0)!.color as RGBA).red).toBe(4);
    });
});
