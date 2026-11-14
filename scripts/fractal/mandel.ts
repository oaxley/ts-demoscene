/*
 * @file    mandel.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Mandelbrot maths for the ts-fractal keyframe generator
 *
 *          Plain TypeScript only (no enums, no parameter properties) so that
 *          Node can run it directly with type stripping.
 */

//----- types
export type Complex = { re: number; im: number };

// zoom path from view 0 (centre c0, width w0) down to the mini-Mandelbrot
// M(w) = n + s.w, in `levels` steps
export interface ZoomPath {
    c0: Complex;
    w0: number;
    n: Complex;
    s: Complex;
    levels: number;
}

export interface View {
    centre: Complex;
    width: number;
    angle: number;
}

//----- constants
const BAILOUT = 256; // squared escape radius (radius 16)

//----- functions

/* continuous (smooth) escape count
 *
 * Returns -1 if the point did not escape after maxIt iterations
 */
export function smoothEscape(cr: number, ci: number, maxIt: number): number {
    let zr = 0;
    let zi = 0;
    for (let n = 0; n < maxIt; n++) {
        const t = zr * zr - zi * zi + cr;
        zi = 2 * zr * zi + ci;
        zr = t;
        const m = zr * zr + zi * zi;
        if (m > BAILOUT) {
            return Math.max(0, n + 1 - Math.log2(Math.log2(m) / 2));
        }
    }
    return -1;
}

/* period of the nearest mini-Mandelbrot (ball method)
 *
 * Returns -1 if no period was found
 */
export function findPeriod(c: Complex, radius: number, maxIt: number): number {
    let zr = 0;
    let zi = 0;
    let dr = 0;
    let di = 0;
    for (let n = 1; n <= maxIt; n++) {
        const ndr = 2 * (zr * dr - zi * di) + 1;
        const ndi = 2 * (zr * di + zi * dr);
        const nzr = zr * zr - zi * zi + c.re;
        zi = 2 * zr * zi + c.im;
        zr = nzr;
        dr = ndr;
        di = ndi;
        if (Math.hypot(zr, zi) < radius * Math.hypot(dr, di)) {
            return n;
        }
        if (zr * zr + zi * zi > 1e10) {
            return -1;
        }
    }
    return -1;
}

// nucleus of the mini-Mandelbrot of a given period (Newton's method)
export function nucleus(c: Complex, period: number): Complex {
    let cr = c.re;
    let ci = c.im;
    for (let k = 0; k < 64; k++) {
        let zr = 0;
        let zi = 0;
        let dr = 0;
        let di = 0;
        for (let n = 0; n < period; n++) {
            const ndr = 2 * (zr * dr - zi * di) + 1;
            const ndi = 2 * (zr * di + zi * dr);
            const nzr = zr * zr - zi * zi + cr;
            zi = 2 * zr * zi + ci;
            zr = nzr;
            dr = ndr;
            di = ndi;
        }
        const den = dr * dr + di * di;
        const sr = (zr * dr + zi * di) / den;
        const si = (zi * dr - zr * di) / den;
        cr -= sr;
        ci -= si;
        if (Math.hypot(sr, si) < 1e-17) {
            break;
        }
    }
    return { re: cr, im: ci };
}

/* complex size of a mini-Mandelbrot: 1 / (beta . lambda^2)
 *
 * The modulus is the scale of the copy, the argument its rotation.
 */
export function sizeEstimate(n: Complex, period: number): Complex {
    let zr = 0;
    let zi = 0;
    let lr = 1;
    let li = 0;
    let br = 1;
    let bi = 0;
    for (let i = 1; i < period; i++) {
        const nzr = zr * zr - zi * zi + n.re;
        zi = 2 * zr * zi + n.im;
        zr = nzr;
        const nlr = 2 * (zr * lr - zi * li);
        li = 2 * (zr * li + zi * lr);
        lr = nlr;
        const d = lr * lr + li * li;
        br += lr / d;
        bi -= li / d;
    }
    // l^2 then b.l^2, then its inverse
    const l2r = lr * lr - li * li;
    const l2i = 2 * lr * li;
    const dr = br * l2r - bi * l2i;
    const di = br * l2i + bi * l2r;
    const d = dr * dr + di * di;
    return { re: dr / d, im: -di / d };
}

// fixed point of the similarity w -> n + s.w
export function fixedPoint(path: ZoomPath): Complex {
    // P = n / (1 - s)
    const ar = 1 - path.s.re;
    const ai = -path.s.im;
    const d = ar * ar + ai * ai;
    return {
        re: (path.n.re * ar + path.n.im * ai) / d,
        im: (path.n.im * ar - path.n.re * ai) / d,
    };
}

// view at zoom level z (0 = view 0, levels = mini-Mandelbrot copy of view 0)
export function viewAt(path: ZoomPath, z: number): View {
    const t = z / path.levels;
    const p = fixedPoint(path);

    // q = s^t
    const mod = Math.pow(Math.hypot(path.s.re, path.s.im), t);
    const angle = Math.atan2(path.s.im, path.s.re) * t;
    const qr = mod * Math.cos(angle);
    const qi = mod * Math.sin(angle);

    // centre = P + (c0 - P).q
    const dr = path.c0.re - p.re;
    const di = path.c0.im - p.im;
    return {
        centre: { re: p.re + dr * qr - di * qi, im: p.im + dr * qi + di * qr },
        width: path.w0 * mod,
        angle: z === 0 ? 0 : angle,
    };
}
