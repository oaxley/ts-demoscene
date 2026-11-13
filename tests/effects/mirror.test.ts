/*
 * @file    mirror.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   ts-mirror: torus mesh, reflection, sphere map, floor and environment map
 */

//----- imports
import { describe, test, expect } from "vitest";

import { Point2D, Point3D } from "library/core/interfaces";
import { perspective } from "library/maths/projection";
import { isClockwise } from "library/maths/mesh";
import {
    torusMesh,
    reflect,
    sphereUV,
    envDirection,
    skyUV,
    skyDirection,
} from "../../files/effects/ts-mirror/src/torus";
import {
    floorColor,
    checker,
    drawFloor,
    buildEnvMap,
    HAZE_COLOR,
    TILE,
    HORIZON,
    FLOOR_Y,
    FOG,
    MIRROR_FOG,
    ZOOM,
    CHECK_A,
    CHECK_B,
} from "../../files/effects/ts-mirror/src/floor";
import {
    Mirror,
    torusPath,
    usesSkyMap,
    MAJOR_R,
    MINOR_R,
    REFLECTANCE,
    SCROLL,
    CLOUD_SCROLL,
} from "../../files/effects/ts-mirror/src/mirror";
import { cloudTexture, sampleCloud, CLOUD_SIZE } from "../../files/effects/ts-mirror/src/clouds";
import { drawSky, skyColor, ZENITH, CLOUD_Y, CLOUD_SEED, CLOUD_TEXEL } from "../../files/effects/ts-mirror/src/sky";
import { EFFECTS } from "../effects";
import { Display } from "library/core/display";
import { FakeCanvas } from "../harness/dom";
import { WIDTH, HEIGHT } from "../harness/runner";

//----- helpers
const R = 60;
const r = 24;

function dot(a: Point3D, b: Point3D): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

function len(a: Point3D): number {
    return Math.hypot(a.x, a.y, a.z);
}

function v3(x: number, y: number, z: number): Point3D {
    return { x, y, z };
}

//----- tests
describe("ts-mirror torus", () => {
    test("mesh sizes", () => {
        const mesh = torusMesh(R, r, 32, 16);
        expect(mesh.vertices.length).toBe(512);
        expect(mesh.normals.length).toBe(512);
        expect(mesh.quads.length).toBe(512);
        for (const q of mesh.quads) {
            expect(q.length).toBe(4);
            for (const i of q) {
                expect(i >= 0 && i < 512).toBe(true);
            }
        }
    });

    test("normals are unit and outward", () => {
        const mesh = torusMesh(R, r, 32, 16);
        mesh.vertices.forEach((p, k) => {
            const n = mesh.normals[k];
            const a = Math.atan2(p.z, p.x);
            const c = v3(R * Math.cos(a), 0, R * Math.sin(a));
            const pc = v3(p.x - c.x, p.y - c.y, p.z - c.z);
            expect(len(n)).toBeCloseTo(1, 9);
            expect(len(pc)).toBeCloseTo(r, 9);
            expect(dot(n, pc)).toBeGreaterThan(0);
        });
    });

    test("outward quads are clockwise", () => {
        const mesh = torusMesh(R, r, 32, 16);
        const world = mesh.vertices.map((p) => v3(p.x, p.y, p.z + 500));
        const screen = world.map((p) => {
            const o: Point2D = { x: 0, y: 0 };
            perspective(p.x, p.y, p.z, 600, 0, 320, 240, o);
            return o;
        });
        let checked = 0;
        for (const q of mesh.quads) {
            const c = v3(0, 0, 0);
            const n = v3(0, 0, 0);
            for (const i of q) {
                c.x += world[i].x / 4;
                c.y += world[i].y / 4;
                c.z += world[i].z / 4;
                n.x += mesh.normals[i].x / 4;
                n.y += mesh.normals[i].y / 4;
                n.z += mesh.normals[i].z / 4;
            }
            const facing = dot(n, c) / (len(n) * len(c));
            if (facing < -0.2) {
                expect(isClockwise(screen[q[0]], screen[q[1]], screen[q[2]])).toBe(true);
                checked++;
            }
        }
        expect(checked).toBeGreaterThan(50);
    });

    test("reflect", () => {
        const out = v3(0, 0, 0);
        reflect(v3(0, 0, 1), v3(0, 0, -1), out);
        expect(out.x).toBeCloseTo(0, 12);
        expect(out.y).toBeCloseTo(0, 12);
        expect(out.z).toBeCloseTo(-1, 12);

        reflect(v3(1, 0, 0), v3(0, 1, 0), out);
        expect(out).toEqual({ x: 1, y: 0, z: 0 });

        const s = Math.SQRT1_2;
        reflect(v3(s, s, 0), v3(0, -1, 0), out);
        expect(out.x).toBeCloseTo(s, 12);
        expect(out.y).toBeCloseTo(-s, 12);
        for (const [d, n] of [
            [v3(0.6, 0, 0.8), v3(0, 0.6, -0.8)],
            [v3(0, 0.28, 0.96), v3(0.8, -0.6, 0)],
        ]) {
            reflect(d, n, out);
            expect(len(out)).toBeCloseTo(1, 12);
        }
    });

    test("sphere map centre and horizon", () => {
        const uv: Point2D = { x: 0, y: 0 };
        sphereUV(v3(0, 1, 0), uv);
        expect(uv).toEqual({ x: 128, y: 128 });

        sphereUV(v3(1, 0, 0), uv);
        expect(Math.hypot(uv.x - 128, uv.y - 128)).toBeCloseTo(127 * Math.SQRT1_2, 9);

        sphereUV(v3(0, -1, 0), uv);
        expect(Number.isFinite(uv.x) && Number.isFinite(uv.y)).toBe(true);
        expect(uv.x >= 0 && uv.x <= 256 && uv.y >= 0 && uv.y <= 256).toBe(true);
    });

    test("sphere map round trip", () => {
        const d = v3(0, 0, 0);
        const uv: Point2D = { x: 0, y: 0 };
        let checked = 0;
        for (let v = 0; v < 256; v += 7) {
            for (let u = 0; u < 256; u += 7) {
                if (!envDirection(u, v, d)) continue;
                expect(len(d)).toBeCloseTo(1, 9);
                sphereUV(d, uv);
                expect(Math.abs(uv.x - (u + 0.5))).toBeLessThan(0.6);
                expect(Math.abs(uv.y - (v + 0.5))).toBeLessThan(0.6);
                checked++;
            }
        }
        expect(checked).toBeGreaterThan(900);
        expect(envDirection(0, 0, d)).toBe(false);
    });
});

describe("ts-mirror floor", () => {
    test("checker alternates and has no double column at x = 0", () => {
        expect(floorColor(1, 400, 0)).not.toBe(floorColor(TILE + 1, 400, 0));
        expect(floorColor(-1, 400, 0)).not.toBe(floorColor(1, 400, 0));
        expect(floorColor(1, 400, 0)).toBe(floorColor(1, 400, 2 * TILE));
    });

    test("fog toward the sky", () => {
        expect(floorColor(0, 1e7, 0)).toBe(HAZE_COLOR);
        expect(floorColor(0, Infinity, 0)).toBe(HAZE_COLOR);
        expect(floorColor(0, 400, 0)).not.toBe(HAZE_COLOR);
    });

    test("floor behind the camera stays a valid fogged colour", () => {
        // same fog as in front, and the checker still alternates
        const front = floorColor(1, 400, 0);
        const back = floorColor(1, -400, 0);
        const lum = (c: number) => (c & 0xff) + ((c >>> 8) & 0xff) + ((c >>> 16) & 0xff);
        expect([lum(back), lum(floorColor(TILE + 1, -400, 0))].sort()).toEqual(
            [lum(front), lum(floorColor(TILE + 1, 400, 0))].sort(),
        );
    });

    test("drawFloor fills the rows below the horizon", () => {
        const dst = new Uint32Array(640 * 480);
        drawFloor(dst, 640, 480, 0);
        for (let i = (HORIZON + 1) * 640; i < dst.length; i++) {
            if (dst[i] === 0 || dst[i] >>> 24 !== 0xff) {
                throw new Error(`bad pixel ${i}: ${dst[i].toString(16)}`);
            }
        }
        const row = (y: number) => dst.subarray(y * 640, (y + 1) * 640);
        expect(row(HORIZON).every((c) => c === 0)).toBe(true); // the sky is drawSky's job
        expect(row(HORIZON + 1).every((c) => c !== 0)).toBe(true);
        expect(new Set(row(479)).size).toBeGreaterThan(1);
    });

    test("scroll moves the floor toward the viewer", () => {
        const bottom = (scroll: number) => {
            const dst = new Uint32Array(640 * 480);
            drawFloor(dst, 640, 480, scroll);
            return Array.from(dst.subarray(479 * 640));
        };
        expect(bottom(TILE)).not.toEqual(bottom(0));
        expect(bottom(2 * TILE)).toEqual(bottom(0));
    });

    test("env map: centre is floor under the torus", () => {
        const map = new Uint32Array(256 * 256);
        // torus above the middle of a square (x = 0.5 TILE, z = 8.5 TILE): no edge under it
        buildEnvMap(map, 0.5 * TILE, 83, 8.5 * TILE, 0, 0, false);
        const d = v3(0, 0, 0);
        envDirection(128, 128, d);
        const t = (FLOOR_Y - 83) / d.y;
        // right under the torus the footprint is tiny: the sharp checker colour (± filtering)
        const want = floorColor(
            0.5 * TILE + d.x * t,
            8.5 * TILE + d.z * t,
            0,
            Math.hypot(d.x * t, d.z * t),
            MIRROR_FOG,
        );
        const got = map[(128 << 8) | 128];
        for (let k = 0; k < 3; k++) {
            expect(Math.abs(((got >>> (8 * k)) & 0xff) - ((want >>> (8 * k)) & 0xff))).toBeLessThan(16);
        }
        expect(map[0]).toBe(HAZE_COLOR); // outside the disc
    });

    test("filtered checker: exact when sharp, mid grey when the footprint covers many squares", () => {
        // footprint 0: exactly the checker
        for (const x of [-130, -1, 1, 59, 61, 200]) {
            expect(checker(x / TILE, 0.3, 0, 0)).toBe(Math.floor(x / TILE) & 1);
        }
        // footprint of 8 squares: the average of both colours
        expect(checker(0.3, 0.3, 8, 8)).toBeCloseTo(0.5, 6);
        expect(checker(0.3, 0.3, 8, 0)).toBeCloseTo(0.5, 6);
        // always in [0, 1]
        for (let k = 0; k < 50; k++) {
            const c = checker(k * 0.37, k * 0.91, (k % 7) * 0.3, (k % 5) * 0.4);
            expect(c >= 0 && c <= 1).toBe(true);
        }
    });

    test("env map has no speckle (no isolated texels in the far ring)", () => {
        // an isolated texel is brighter (or darker) than both its neighbours by a lot: aliasing
        const map = new Uint32Array(256 * 256);
        const red = (u: number, v: number) => map[(v << 8) | u] & 0xff;
        const jump = 0.2 * Math.abs(CHECK_A[0] - CHECK_B[0]); // 20% of the checker contrast
        for (const scroll of [0, 17]) {
            buildEnvMap(map, 0, 83, 500, scroll, 0, false);
            let isolated = 0;
            let n = 0;
            for (let v = 1; v < 255; v++) {
                for (let u = 1; u < 255; u++) {
                    const rho = Math.hypot((u + 0.5 - 128) / 127, (v + 0.5 - 128) / 127);
                    if (rho < 0.45 || rho >= 0.7) continue;
                    n++;
                    const c = red(u, v);
                    for (const [a, b] of [
                        [red(u - 1, v), red(u + 1, v)],
                        [red(u, v - 1), red(u, v + 1)],
                    ]) {
                        if (Math.min(c - a, c - b) > jump || Math.min(a - c, b - c) > jump) {
                            isolated++;
                            break;
                        }
                    }
                }
            }
            expect(isolated / n).toBeLessThan(0.005);
        }
    });

    test("far floor rows blend instead of flickering", () => {
        // rows whose pixels cover 2 to 3 squares in depth: filtered, the contrast left (relative
        // to the fogged A / B contrast) is small, instead of whole rows of pure A or pure B
        const y = HORIZON + Math.round((FLOOR_Y * ZOOM) / 4200);
        const z = (FLOOR_Y * ZOOM) / (y - HORIZON);
        const full = Math.abs(CHECK_A[0] - CHECK_B[0]) * Math.exp(-z / FOG);
        for (const scroll of [0, 13, 29, 41]) {
            const dst = new Uint32Array(640 * 480);
            drawFloor(dst, 640, 480, scroll);
            const red = Array.from(dst.subarray(y * 640, (y + 1) * 640), (c) => c & 0xff);
            expect((Math.max(...red) - Math.min(...red)) / full).toBeLessThan(0.5);
        }
    });

    test("env map fogs far sideways floor points (no aliased checker)", () => {
        // a ray going right, just below the horizon, hits the floor ~6000 units away sideways
        const map = new Uint32Array(256 * 256);
        buildEnvMap(map, 0, 83, 500, 0, 0, false);
        const d = v3(1, 0.02, 0);
        const l = len(d);
        const uv: Point2D = { x: 0, y: 0 };
        sphereUV(v3(d.x / l, d.y / l, d.z / l), uv);
        const c = map[(Math.floor(uv.y) << 8) | Math.floor(uv.x)];
        const ch = (k: number, s: number) => Math.abs(((c >>> (8 * k)) & 0xff) - ((s >>> (8 * k)) & 0xff));
        for (let k = 0; k < 3; k++) {
            expect(ch(k, HAZE_COLOR)).toBeLessThan(12);
        }
    });
});

describe("ts-mirror effect", () => {
    test("registered", () => {
        expect(EFFECTS["ts-mirror"]).toBe(Mirror);
    });

    test("path keeps the torus on screen and above the floor", () => {
        const e = MAJOR_R + MINOR_R;
        for (let f = 0; f <= 5000; f += 7) {
            const c = torusPath(f);
            expect(c.y + e).toBeLessThan(FLOOR_Y);
            for (const [dx, dy] of [
                [-e, -e],
                [e, -e],
                [e, e],
                [-e, e],
            ]) {
                const z = c.z - e; // nearest depth: largest on screen
                const sx = WIDTH / 2 + ((c.x + dx) * ZOOM) / z;
                const sy = HORIZON + ((c.y + dy) * ZOOM) / z;
                expect(sx >= 0 && sx <= WIDTH && sy >= 0 && sy <= HEIGHT).toBe(true);
            }
        }
    });

    test("each quad picks the map whose blind spot it cannot see", () => {
        // camera space is y down: a reflected ray going up has a negative y
        const down = [v3(0, 1, 0), v3(0.1, 0.99, 0), v3(0, 0.9, 0.43), v3(-0.3, 0.95, 0)];
        expect(usesSkyMap(down, [0, 1, 2, 3])).toBe(false);
        const level = [v3(1, 0, 0), v3(0.99, -0.1, 0), v3(0.95, 0.3, 0), v3(0.9, -0.4, 0.17)];
        expect(usesSkyMap(level, [0, 1, 2, 3])).toBe(false);
        const upward = [...level.slice(0, 3), v3(0, -0.8, 0.6)];
        expect(usesSkyMap(upward, [0, 1, 2, 3])).toBe(true);
        expect(usesSkyMap([v3(0, -1, 0)], [0, 0, 0, 0])).toBe(true);
    });

    // render n frames, returns the pixels of the last two
    async function frames(n: number): Promise<Uint8ClampedArray[]> {
        const canvas = new FakeCanvas(WIDTH, HEIGHT);
        const display = new Display(canvas as unknown as HTMLCanvasElement);
        const m = new Mirror(display);
        m.setup();
        for (let i = 0; i < 200 && !m.isAnimated; i++) {
            await new Promise((r) => setTimeout(r, 0));
        }
        const out: Uint8ClampedArray[] = [];
        for (let i = 0; i < n; i++) {
            m.run(1000 + i * 50);
            if (i >= n - 2) {
                out.push(Uint8ClampedArray.from(canvas.getContext("2d").getImageData(0, 0, WIDTH, HEIGHT).data));
            }
        }
        return out;
    }

    test("frame shows sky, floor and the mirrored torus", async () => {
        const [a, b] = await frames(31);
        const px = (d: Uint8ClampedArray, x: number, y: number) => {
            const i = (y * WIDTH + x) * 4;
            return [d[i], d[i + 1], d[i + 2]];
        };
        const sky = [HAZE_COLOR & 0xff, (HAZE_COLOR >>> 8) & 0xff, (HAZE_COLOR >>> 16) & 0xff];
        // the sky overhead is the zenith gradient or a cloud, never the flat haze
        expect(px(a, 5, 5)).not.toEqual(sky);
        expect(px(a, 5, 5)[2]).toBeGreaterThan(150);
        expect(px(a, 5, 470)).not.toEqual(sky);

        // inside the torus bounding box (frame 29), well above the floor horizon area:
        // both checker hues show (white-ish and black), reflected on the torus
        const c = torusPath(29);
        const cx = Math.round(WIDTH / 2 + (c.x * ZOOM) / c.z);
        const cy = Math.round(HORIZON + (c.y * ZOOM) / c.z);
        const e = Math.round(((MAJOR_R + MINOR_R) * ZOOM) / c.z);
        let white = 0;
        let black = 0;
        for (let y = cy - e; y < cy + e; y++) {
            for (let x = cx - e; x < cx + e; x++) {
                const [r, g, bl] = px(a, x, y);
                if (r > 150 && g > 150 && bl > 150) white++;
                if (r < 30 && g < 30 && bl < 30) black++;
            }
        }
        expect(white).toBeGreaterThan(20);
        expect(black).toBeGreaterThan(20);

        // the top of the torus reflects the blue sky (deep blue pixels) above the floor
        let skyBlue = 0;
        for (let y = cy - e; y < cy; y++) {
            for (let x = cx - e; x < cx + e; x++) {
                const [r, , bl] = px(a, x, y);
                if (bl > r + 60) skyBlue++;
            }
        }
        expect(skyBlue).toBeGreaterThan(20);
        expect(Buffer.from(a).equals(Buffer.from(b))).toBe(false);

        // the mirror reflects less than 100%: on the torus (the pixels that differ from the
        // scene without it) no channel is brighter than 80% of white, so its outline shows
        const bg = new Uint32Array(WIDTH * HEIGHT);
        drawSky(bg, WIDTH, HEIGHT, 29 * CLOUD_SCROLL);
        drawFloor(bg, WIDTH, HEIGHT, 29 * SCROLL);
        let torus = 0;
        let tooBright = 0;
        for (let i = 0; i < WIDTH * HEIGHT; i++) {
            const c = bg[i];
            const r = a[i * 4];
            const g = a[i * 4 + 1];
            const bl = a[i * 4 + 2];
            if (r === (c & 0xff) && g === ((c >>> 8) & 0xff) && bl === ((c >>> 16) & 0xff)) continue;
            torus++;
            if (Math.max(r, g, bl) > 255 * REFLECTANCE + 1) tooBright++;
        }
        expect(torus).toBeGreaterThan(1000);
        expect(tooBright).toBe(0);
    });
});

describe("ts-mirror clouds", () => {
    const tex = cloudTexture(7);
    const base = tex.levels[0];
    const at = (x: number, y: number) => base[((y & 255) << 8) | (x & 255)];

    test("densities in [0, 1], deterministic", () => {
        expect(base.length).toBe(CLOUD_SIZE * CLOUD_SIZE);
        expect(base.every((d) => d >= 0 && d <= 1)).toBe(true);
        expect(cloudTexture(7).levels[0]).toEqual(base);
        expect(cloudTexture(8).levels[0]).not.toEqual(base);
    });

    test("puffs: clear sky and thick clouds both present", () => {
        let mean = 0;
        let clear = 0;
        let thick = 0;
        for (const d of base) {
            mean += d / base.length;
            if (d < 0.05) clear++;
            if (d > 0.8) thick++;
        }
        expect(mean).toBeGreaterThan(0.2);
        expect(mean).toBeLessThan(0.6);
        expect(clear).toBeGreaterThan(base.length * 0.1);
        expect(thick).toBeGreaterThan(base.length * 0.05);
    });

    test("tiles without a seam", () => {
        let inside = 0;
        let seam = 0;
        for (let k = 0; k < 256; k++) {
            inside = Math.max(inside, Math.abs(at(100, k) - at(101, k)), Math.abs(at(k, 100) - at(k, 101)));
            seam = Math.max(seam, Math.abs(at(255, k) - at(0, k)), Math.abs(at(k, 255) - at(k, 0)));
        }
        expect(seam).toBeLessThanOrEqual(inside * 1.5 + 0.02);
        expect(sampleCloud(tex, 10.3 + 256, 40.7, 0)).toBeCloseTo(sampleCloud(tex, 10.3, 40.7, 0), 6);
        expect(sampleCloud(tex, -5.5, 40.7 - 512, 0)).toBeCloseTo(sampleCloud(tex, 250.5, 40.7, 0), 6);
    });

    test("levels average down: a huge footprint gives the mean cover", () => {
        expect(tex.levels.length).toBe(9);
        expect(tex.levels[8].length).toBe(1);
        const mean = base.reduce((a, b) => a + b, 0) / base.length;
        expect(tex.levels[8][0]).toBeCloseTo(mean, 4);
        expect(sampleCloud(tex, 17, 93, 1000)).toBeCloseTo(mean, 4);
        expect(sampleCloud(tex, 17, 93, 0)).toBeCloseTo(at(17, 93), 6);
    });
});

describe("ts-mirror sky", () => {
    const red = (c: number) => c & 0xff;
    const blue = (c: number) => (c >>> 16) & 0xff;
    const sky = (scroll: number) => {
        const dst = new Uint32Array(640 * 480);
        drawSky(dst, 640, 480, scroll);
        return dst;
    };

    test("fills the rows above the horizon, haze at the horizon", () => {
        const dst = sky(0);
        for (let i = 0; i < (HORIZON + 1) * 640; i++) {
            if (dst[i] === 0 || dst[i] >>> 24 !== 0xff) {
                throw new Error(`bad pixel ${i}: ${dst[i].toString(16)}`);
            }
        }
        expect(dst.subarray(HORIZON * 640, (HORIZON + 1) * 640).every((c) => c === HAZE_COLOR)).toBe(true);
        expect(dst[(HORIZON + 1) * 640]).toBe(0); // the floor is drawFloor's job
    });

    test("clouds overhead: white puffs and clear sky darker than the haze", () => {
        const top = Array.from(sky(0).subarray(0, 640 * 20));
        expect(new Set(top).size).toBeGreaterThan(20);
        expect(top.some((c) => red(c) > 200 && blue(c) > 200)).toBe(true);
        const clear = Math.min(...top.map(red));
        expect(clear).toBeLessThan(red(HAZE_COLOR) - 30);
        expect(Math.min(...top.map(blue))).toBeGreaterThan(Math.min(...top.map(red))); // blue sky
    });

    test("far clouds blend into the haze (rows near the horizon)", () => {
        const row = Array.from(sky(0).subarray((HORIZON - 2) * 640, (HORIZON - 1) * 640));
        for (const c of row) {
            for (let k = 0; k < 3; k++) {
                expect(Math.abs(((c >>> (8 * k)) & 0xff) - ((HAZE_COLOR >>> (8 * k)) & 0xff))).toBeLessThan(25);
            }
        }
    });

    test("scroll moves the clouds", () => {
        expect(Array.from(sky(50).subarray(0, 640 * 40))).not.toEqual(Array.from(sky(0).subarray(0, 640 * 40)));
    });

    test("skyColor: zenith straight up without cloud cover, haze far away", () => {
        // a clear spot of the texture
        const tex = cloudTexture(CLOUD_SEED);
        let cx = 0;
        while (tex.levels[0][cx] > 0) cx++;
        const c = skyColor(cx * CLOUD_TEXEL, 0, 1, -CLOUD_Y, 0);
        for (let k = 0; k < 3; k++) {
            expect(Math.abs(((c >>> (8 * k)) & 0xff) - ZENITH[k])).toBeLessThan(25);
        }
        expect(skyColor(0, 1e7, 0.001, 1e7, 1e5)).toBe(HAZE_COLOR);
        expect(skyColor(0, 0, 0.5, NaN, 0)).toBe(HAZE_COLOR);
    });
});

describe("ts-mirror sky map", () => {
    const ch = (c: number, k: number) => (c >>> (8 * k)) & 0xff;

    test("sky map: centre straight up, round trip", () => {
        const uv: Point2D = { x: 0, y: 0 };
        skyUV(v3(0, -1, 0), uv);
        expect(uv).toEqual({ x: 128, y: 128 });
        const d = v3(0, 0, 0);
        let checked = 0;
        for (let v = 0; v < 256; v += 9) {
            for (let u = 0; u < 256; u += 9) {
                if (!skyDirection(u, v, d)) continue;
                expect(len(d)).toBeCloseTo(1, 9);
                skyUV(d, uv);
                expect(Math.abs(uv.x - (u + 0.5))).toBeLessThan(0.6);
                expect(Math.abs(uv.y - (v + 0.5))).toBeLessThan(0.6);
                checked++;
            }
        }
        expect(checked).toBeGreaterThan(500);
        skyDirection(128, 128, d);
        expect(d.y).toBeLessThan(-0.99);
    });

    test("both maps show the same scene where both are valid", () => {
        // the mirror switches maps from quad to quad: no visible seam when they agree
        const floorMap = new Uint32Array(256 * 256);
        const skyMap = new Uint32Array(256 * 256);
        buildEnvMap(floorMap, 30, 83, 500, 40, 20, false);
        buildEnvMap(skyMap, 30, 83, 500, 40, 20, true);
        const a: Point2D = { x: 0, y: 0 };
        const b: Point2D = { x: 0, y: 0 };
        const texel = (m: Uint32Array, p: Point2D) => m[(Math.floor(p.y) << 8) | Math.floor(p.x)];
        let diff = 0;
        let n = 0;
        for (let k = 0; k < 2000; k++) {
            // spiral of directions with -0.5 < y < 0.5
            const y = Math.sin(k * 0.7) * 0.5;
            const phi = k * 2.399;
            const s = Math.sqrt(1 - y * y);
            const d = v3(s * Math.cos(phi), y, s * Math.sin(phi));
            sphereUV(d, a);
            skyUV(d, b);
            const ca = texel(floorMap, a);
            const cb = texel(skyMap, b);
            for (let i = 0; i < 3; i++) diff += Math.abs(ch(ca, i) - ch(cb, i));
            n += 3;
        }
        expect(diff / n).toBeLessThan(12); // both maps are built at half resolution
    });

    test("the floor map shows clouds above, the sky map the checker below", () => {
        const floorMap = new Uint32Array(256 * 256);
        const skyMap = new Uint32Array(256 * 256);
        buildEnvMap(floorMap, 0, 83, 500, 0, 0, false);
        buildEnvMap(skyMap, 0, 83, 500, 0, 0, true);
        const ring = (m: Uint32Array, lo: number, hi: number) => {
            const out: number[] = [];
            for (let v = 0; v < 256; v++) {
                for (let u = 0; u < 256; u++) {
                    const rho = Math.hypot((u + 0.5 - 128) / 127, (v + 0.5 - 128) / 127);
                    if (rho >= lo && rho < hi) out.push(m[(v << 8) | u]);
                }
            }
            return out;
        };
        // floor map, upper directions (outside the horizon circle): white clouds and blue sky
        const up = ring(floorMap, 0.75, 0.98);
        expect(up.some((c) => ch(c, 0) > 200 && ch(c, 2) > 200)).toBe(true);
        expect(up.some((c) => ch(c, 2) > ch(c, 0) + 60)).toBe(true);
        // sky map: its centre (straight up) is sky or cloud, its lower ring the checker
        const top = ring(skyMap, 0, 0.3);
        expect(top.every((c) => ch(c, 2) >= ch(c, 0))).toBe(true);
        const down = ring(skyMap, 0.8, 0.98);
        expect(down.some((c) => ch(c, 0) > 180 && ch(c, 1) > 180)).toBe(true);
        expect(down.some((c) => ch(c, 0) < 30 && ch(c, 2) < 30)).toBe(true);
    });

    test("sky map has no speckle (far clouds filtered)", () => {
        const map = new Uint32Array(256 * 256);
        const red = (u: number, v: number) => map[(v << 8) | u] & 0xff;
        for (const cloud of [0, 37]) {
            buildEnvMap(map, 0, 83, 500, 0, cloud, true);
            let isolated = 0;
            let n = 0;
            for (let v = 1; v < 255; v++) {
                for (let u = 1; u < 255; u++) {
                    const rho = Math.hypot((u + 0.5 - 128) / 127, (v + 0.5 - 128) / 127);
                    if (rho < 0.3 || rho >= 0.7) continue;
                    n++;
                    const c = red(u, v);
                    for (const [a, b] of [
                        [red(u - 1, v), red(u + 1, v)],
                        [red(u, v - 1), red(u, v + 1)],
                    ]) {
                        if (Math.min(c - a, c - b) > 30 || Math.min(a - c, b - c) > 30) {
                            isolated++;
                            break;
                        }
                    }
                }
            }
            expect(isolated / n).toBeLessThan(0.005);
        }
    });
});
