/*
 * @file    fractal-keyframes.mts
 * @author  Sebastien LEGRAND
 *
 * @brief   Render the ts-fractal zoom keyframes (offline, run by hand)
 *
 * Usage:
 *      node scripts/fractal-keyframes.mts [--size 960x720] [--ss 3] [--target 35|39] [--only k]
 *
 *      --size  : keyframe size in pixels
 *      --ss    : supersampling (ss x ss samples per pixel)
 *      --target: period of the Seahorse Valley mini-Mandelbrot to dive into
 *      --only  : render only keyframe k (metadata is not rewritten)
 *
 * Output:
 *      files/effects/ts-fractal/assets/kf-NN.png   8-bit grayscale palette indices (0 = inside)
 *      files/effects/ts-fractal/src/keyframes.ts   zoom metadata used by the effect
 *
 * Keyframe k shows the view at zoom level k of a similarity zoom that maps the
 * full set (keyframe 0) onto the mini-Mandelbrot (keyframe N). Every keyframe
 * is keyframe k-1 scaled by `ratio` and turned by `stepAngle` around the same
 * pixel (the pivot, image of the zoom fixed point).
 */

//----- imports
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { PNG } from "pngjs";

import type { Complex, ZoomPath } from "./fractal/mandel.ts";
import { findPeriod, nucleus, sizeEstimate, viewAt, fixedPoint } from "./fractal/mandel.ts";

//----- globals
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EFFECT_DIR = path.join(ROOT, "files/effects/ts-fractal");

const SEAHORSE: Complex = { re: -0.743643887037151, im: 0.13182590420533 };

// mini-Mandelbrots near the Seahorse point: period -> search radius
// (35 is the closest look-alike of the full set, 39 a shallower fallback)
const TARGETS: Record<number, number> = { 35: 1e-3, 39: 1e-4 };
const C0: Complex = { re: -0.6, im: 0 }; // centre of keyframe 0
const W0 = 3.6; // width of keyframe 0 (imaginary range +/-1.35 contains the set)
const BASE_IT = 1000; // iterations for keyframe 0, scaled up to BASE_IT * period at the end
const DENSITY = 40; // palette indices per octave of escape count
const BAILOUT = 256; // squared escape radius

interface Job {
    k: number;
    width: number;
    height: number;
    ss: number;
    maxIt: number;
    centre: Complex;
    pixel: number; // pixel size
    angle: number;
}

//----- functions

// escape count of one sample, with periodicity check (cheap exit inside the set)
function escape(cr: number, ci: number, maxIt: number): number {
    let zr = 0;
    let zi = 0;
    let pr = 0;
    let pi = 0;
    let period = 8;
    for (let n = 0; n < maxIt; n++) {
        const t = zr * zr - zi * zi + cr;
        zi = 2 * zr * zi + ci;
        zr = t;
        const m = zr * zr + zi * zi;
        if (m > BAILOUT) {
            return Math.max(0, n + 1 - Math.log2(Math.log2(m) / 2));
        }
        const dr = zr - pr;
        const di = zi - pi;
        if (dr * dr + di * di < 1e-28) {
            return -1;
        }
        if (n === period) {
            pr = zr;
            pi = zi;
            period *= 2;
        }
    }
    return -1;
}

/* render one keyframe: log2(1 + mean escape) per pixel, -1 inside
 *
 * Pixel (x, y) is centred at (x + 0.5, y + 0.5), y goes down; the view is
 * turned by `angle` around its centre.
 */
function renderKeyframe(job: Job): Float32Array {
    const { width, height, ss, maxIt, centre, pixel, angle } = job;
    const out = new Float32Array(width * height);
    const cos = Math.cos(angle) * pixel;
    const sin = Math.sin(angle) * pixel;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0;
            let escaped = 0;
            for (let j = 0; j < ss; j++) {
                const v = height / 2 - (y + (j + 0.5) / ss);
                for (let i = 0; i < ss; i++) {
                    const u = x + (i + 0.5) / ss - width / 2;
                    const n = escape(centre.re + u * cos - v * sin, centre.im + u * sin + v * cos, maxIt);
                    if (n >= 0) {
                        sum += Math.log2(1 + n);
                        escaped++;
                    }
                }
            }
            out[y * width + x] = escaped * 2 > ss * ss ? sum / escaped : -1;
        }
    }
    return out;
}

// palette index of a log escape value (0 = inside)
function toIndex(l: number): number {
    return l < 0 ? 0 : 1 + (Math.floor(l * DENSITY) % 255);
}

function writePng(file: string, width: number, height: number, values: Float32Array): void {
    const png = new PNG({ width, height, colorType: 0, inputColorType: 0, inputHasAlpha: false });
    const data = Buffer.alloc(width * height);
    for (let i = 0; i < data.length; i++) {
        data[i] = toIndex(values[i]);
    }
    png.data = data;
    fs.writeFileSync(file, PNG.sync.write(png, { colorType: 0, inputColorType: 0, inputHasAlpha: false }));
}

// most frequent palette offset between two keyframes (circular, mod 255)
function colourOffset(first: Float32Array, last: Float32Array): number {
    const hist = new Uint32Array(255);
    for (let i = 0; i < first.length; i++) {
        if (first[i] >= 0 && last[i] >= 0) {
            hist[(((toIndex(last[i]) - toIndex(first[i])) % 255) + 255) % 255]++;
        }
    }
    let best = 0;
    for (let i = 1; i < 255; i++) {
        if (hist[i] > hist[best]) best = i;
    }
    return best;
}

function writeMetadata(meta: Record<string, unknown>): void {
    const pivot = meta.pivot as { x: number; y: number };
    const text = `/*
 * @file    keyframes.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   ts-fractal zoom keyframes metadata
 *
 *          GENERATED by scripts/fractal-keyframes.mts, do not edit.
 *          Regenerate with: node scripts/fractal-keyframes.mts
 */

//----- globals
export const KEYFRAMES = {
    count: ${meta.count}, // number of keyframes (levels + 1)
    width: ${meta.width},
    height: ${meta.height},
    ratio: ${meta.ratio}, // scale between two keyframes
    stepAngle: ${meta.stepAngle}, // turn between two keyframes (radians, counter-clockwise)
    pivot: { x: ${pivot.x}, y: ${pivot.y} }, // pixel of the zoom fixed point
    colourOffset: ${meta.colourOffset}, // palette offset of the last keyframe vs the first
};

//----- functions
export function keyframeUrl(i: number): string {
    return \`/images/assets/ts-fractal.kf-\${String(i).padStart(2, "0")}.png\`;
}
`;
    fs.writeFileSync(path.join(EFFECT_DIR, "src/keyframes.ts"), text);
}

function arg(name: string, fallback: string): string {
    const i = process.argv.indexOf(name);
    return i > 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

function runJob(job: Job): Promise<Float32Array> {
    return new Promise((resolve, reject) => {
        const worker = new Worker(fileURLToPath(import.meta.url), { workerData: job });
        worker.once("message", (buf: Float32Array) => resolve(buf));
        worker.once("error", reject);
    });
}

async function main(): Promise<void> {
    const [width, height] = arg("--size", "960x720").split("x").map(Number);
    const ss = Number(arg("--ss", "3"));
    const period = Number(arg("--target", "35"));
    const only = process.argv.includes("--only") ? Number(arg("--only", "0")) : -1;

    // zoom path down to the mini-Mandelbrot
    if (!(period in TARGETS) || findPeriod(SEAHORSE, TARGETS[period], 100000) !== period) {
        throw new Error(`no mini-Mandelbrot of period ${period} near the Seahorse point`);
    }
    const n = nucleus(SEAHORSE, period);
    const s = sizeEstimate(n, period);
    const size = Math.hypot(s.re, s.im);
    const levels = Math.round(Math.log2(1 / size));
    const zoom: ZoomPath = { c0: C0, w0: W0, n, s, levels };
    const p = fixedPoint(zoom);

    const scale = width / W0;
    const meta = {
        count: levels + 1,
        width,
        height,
        ratio: Math.pow(size, -1 / levels),
        stepAngle: Math.atan2(s.im, s.re) / levels,
        pivot: { x: width / 2 - 0.5 + (p.re - C0.re) * scale, y: height / 2 - 0.5 - (p.im - C0.im) * scale },
        colourOffset: 0,
    };
    console.log(`period ${period}, size ${size.toExponential(3)}, ${levels} levels`, meta);

    // render the keyframes on all the cores, deepest (slowest) first
    const ks = only >= 0 ? [only] : [...Array(levels + 1).keys()].reverse();
    const results = new Map<number, Float32Array>();
    const queue = [...ks];
    const lanes = Array.from({ length: Math.min(os.cpus().length, queue.length) }, async () => {
        while (queue.length) {
            const k = queue.shift()!;
            const view = viewAt(zoom, k);
            const t0 = performance.now();
            const values = await runJob({
                k,
                width,
                height,
                ss,
                maxIt: Math.round(BASE_IT * Math.pow(period, k / levels)),
                centre: view.centre,
                pixel: view.width / width,
                angle: view.angle,
            });
            const file = path.join(EFFECT_DIR, `assets/kf-${String(k).padStart(2, "0")}.png`);
            writePng(file, width, height, values);
            if (k === 0 || k === levels) results.set(k, values);
            console.log(`keyframe ${k}: ${((performance.now() - t0) / 1000).toFixed(1)} s`);
        }
    });
    await Promise.all(lanes);

    if (only < 0) {
        meta.colourOffset = colourOffset(results.get(0)!, results.get(levels)!);
        writeMetadata(meta);
        console.log(`colour offset ${meta.colourOffset}`);
    }
}

//----- begin
if (isMainThread) {
    fs.mkdirSync(path.join(EFFECT_DIR, "assets"), { recursive: true });
    fs.mkdirSync(path.join(EFFECT_DIR, "src"), { recursive: true });
    main().catch((e) => {
        console.error(e);
        process.exit(1);
    });
} else {
    parentPort!.postMessage(renderKeyframe(workerData as Job));
}
