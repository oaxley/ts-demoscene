/*
 * @file    maths.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Unit tests for the maths helpers (utils, vectors, fixed)
 */

//----- imports
import { describe, test, expect } from "vitest";

import { radians, degrees, map, constrain, norm, lerp } from "library/maths/utils";
import { Vector2D } from "library/maths/vector2d";
import { Vector3D } from "library/maths/vector3d";
import { Fixed } from "library/maths/fixed";
import { Mersenne } from "library/maths/mersenne";

//----- tests
describe("utils", () => {
    test("radians / degrees", () => {
        expect(radians(180)).toBeCloseTo(Math.PI);
        expect(degrees(Math.PI / 2)).toBeCloseTo(90);
    });

    test("map / norm / lerp", () => {
        expect(map(5, 0, 10, 0, 100)).toBe(50);
        expect(map(-1, -1, 1, 0, 255)).toBe(0);
        expect(norm(25, 0, 100)).toBe(0.25);
        expect(lerp(10, 20, 0.5)).toBe(15);
    });

    test("constrain", () => {
        expect(constrain(-5, 0, 10)).toBe(0);
        expect(constrain(15, 0, 10)).toBe(10);
        expect(constrain(5, 0, 10)).toBe(5);
    });
});

describe("Vector2D", () => {
    test("add / sub / mag", () => {
        const v = new Vector2D(3, 4);
        expect(v.mag()).toBe(5);
        expect(v.add(new Vector2D(1, 1))).toMatchObject({ x: 4, y: 5 });
        expect(v.sub(new Vector2D(1, 1))).toMatchObject({ x: 2, y: 3 });
    });
});

describe("Vector3D", () => {
    const x = new Vector3D(1, 0, 0);
    const y = new Vector3D(0, 1, 0);
    const z = new Vector3D(0, 0, 1);

    test("cross product", () => {
        expect(x.cross(y)).toMatchObject({ x: 0, y: 0, z: 1 });
        expect(y.cross(z)).toMatchObject({ x: 1, y: 0, z: 0 });
        expect(z.cross(x)).toMatchObject({ x: 0, y: 1, z: 0 });
        expect(new Vector3D(1, 2, 3).cross(new Vector3D(4, 5, 6))).toMatchObject({ x: -3, y: 6, z: -3 });
    });

    test("dot / mag / angle", () => {
        expect(new Vector3D(1, 2, 3).dot(new Vector3D(4, 5, 6))).toBe(32);
        expect(new Vector3D(2, 3, 6).mag()).toBe(7);
        expect(x.angle(y)).toBeCloseTo(Math.PI / 2);
    });

    test("rotations", () => {
        const r = x.rotateZ(Math.PI / 2);
        expect(r.x).toBeCloseTo(0);
        expect(r.y).toBeCloseTo(1);
        expect(r.z).toBeCloseTo(0);
    });
});

describe("Fixed (16:16)", () => {
    test("int / float conversions", () => {
        expect(new Fixed(3).int()).toBe(3);
        expect(new Fixed(3).raw).toBe(3 << 16);
        expect(new Fixed(1.5).float()).toBe(1.5);
        expect(new Fixed(-2.25).float()).toBe(-2.25);
        expect(Fixed.fromRaw(0x18000).float()).toBe(1.5);
    });

    test("add / sub", () => {
        expect(new Fixed(1.5).add(new Fixed(2.25)).float()).toBe(3.75);
        expect(new Fixed(1.5).sub(new Fixed(2.25)).float()).toBe(-0.75);
        expect(new Fixed(2).add(new Fixed(3)).int()).toBe(5);
    });

    test("mul / div", () => {
        expect(new Fixed(1.5).mul(new Fixed(2.5)).float()).toBe(3.75);
        expect(new Fixed(-3).mul(new Fixed(0.5)).float()).toBe(-1.5);
        expect(new Fixed(100).mul(new Fixed(100)).int()).toBe(10000);
        expect(new Fixed(7.5).div(new Fixed(2.5)).float()).toBe(3);
        expect(new Fixed(1).div(new Fixed(4)).float()).toBe(0.25);
    });
});

describe("Mersenne (MT19937)", () => {
    // expose the raw 32-bit output for the reference values
    class RawMersenne extends Mersenne {
        public next(): number {
            return this.value();
        }
    }

    test("reference sequence (seed 5489)", () => {
        const mt = new RawMersenne();
        mt.initialize(5489);
        expect([mt.next(), mt.next(), mt.next()]).toEqual([3499211612, 581869302, 3890346734]);

        // 10000th output of the reference implementation
        for (let i = 3; i < 9999; i++) mt.next();
        expect(mt.next()).toBe(4123659995);
    });

    test("rand() in [0, 1]", () => {
        const mt = new Mersenne();
        mt.initialize(42);
        for (let i = 0; i < 2000; i++) {
            const r = mt.rand();
            expect(r).toBeGreaterThanOrEqual(0);
            expect(r).toBeLessThanOrEqual(1);
        }
    });
});
