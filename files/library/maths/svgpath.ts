/*
 * @file    svgpath.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Minimal SVG path parser (M, C, S commands) and arc-length sampler
 *
 * Enough for the KanjiVG stroke data: each path is turned into a list of cubic
 * Bézier segments, then into points evenly spaced along the curve.
 */

//----- imports
import { Point2D } from "library/core/interfaces";

//----- globals
const FLATTEN = 32; // number of sub-points used to measure a Bézier segment

// tokens: a command letter or a number (with optional sign, decimals, exponent)
const TOKENS = /[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;

//----- interfaces
// a cubic Bézier segment
export interface Bezier {
    p0: Point2D;
    p1: Point2D;
    p2: Point2D;
    p3: Point2D;
}

//----- functions

/* parse an SVG path into cubic Bézier segments
 *
 * Args:
 *      d: the path string (commands M m C c S s, implicit repeats allowed)
 *
 * Returns:
 *      the list of segments, in path order
 */
export function parsePath(d: string): Bezier[] {
    const tokens = d.match(TOKENS) ?? [];
    const segments: Bezier[] = [];

    let cur: Point2D = { x: 0, y: 0 };
    let lastCtrl: Point2D | undefined; // second control point of the previous cubic
    let cmd = "";
    let i = 0;

    const num = (): number => {
        const t = tokens[i++];
        if (t === undefined || /[A-Za-z]/.test(t)) {
            throw new Error(`SVG path: number expected after '${cmd}'`);
        }
        return parseFloat(t);
    };

    while (i < tokens.length) {
        // a new command, or an implicit repeat of the previous one
        if (/[A-Za-z]/.test(tokens[i])) {
            cmd = tokens[i++];
        }

        const rel = cmd === cmd.toLowerCase();
        const pt = (): Point2D => {
            const x = num();
            const y = num();
            return rel ? { x: cur.x + x, y: cur.y + y } : { x, y };
        };

        switch (cmd.toLowerCase()) {
            case "m":
                cur = pt();
                lastCtrl = undefined;
                break;
            case "c": {
                const p1 = pt();
                const p2 = pt();
                const p3 = pt();
                segments.push({ p0: cur, p1, p2, p3 });
                lastCtrl = p2;
                cur = p3;
                break;
            }
            case "s": {
                const p1 = lastCtrl ? { x: 2 * cur.x - lastCtrl.x, y: 2 * cur.y - lastCtrl.y } : cur;
                const p2 = pt();
                const p3 = pt();
                segments.push({ p0: cur, p1, p2, p3 });
                lastCtrl = p2;
                cur = p3;
                break;
            }
            default:
                throw new Error(`SVG path: unsupported command '${cmd}'`);
        }
    }

    return segments;
}

// point on a cubic Bézier at parameter t
function bezierAt(b: Bezier, t: number): Point2D {
    const u = 1 - t;
    const a = u * u * u;
    const c1 = 3 * u * u * t;
    const c2 = 3 * u * t * t;
    const c3 = t * t * t;
    return {
        x: a * b.p0.x + c1 * b.p1.x + c2 * b.p2.x + c3 * b.p3.x,
        y: a * b.p0.y + c1 * b.p1.y + c2 * b.p2.y + c3 * b.p3.y,
    };
}

/* sample an SVG path into points evenly spaced along the curve
 *
 * Args:
 *      d   : the path string (see parsePath)
 *      step: distance between two points (in path units)
 *
 * Returns:
 *      the points, from the path start to the path end (both included)
 */
export function samplePath(d: string, step: number): Point2D[] {
    const segments = parsePath(d);
    if (segments.length === 0) {
        return [];
    }

    // flatten the whole path into a polyline
    const poly: Point2D[] = [segments[0].p0];
    for (const b of segments) {
        for (let k = 1; k <= FLATTEN; k++) {
            poly.push(bezierAt(b, k / FLATTEN));
        }
    }

    // walk the polyline, emit a point every `step` units
    const out: Point2D[] = [{ x: poly[0].x, y: poly[0].y }];
    let travelled = 0; // length walked so far
    let next = step; // length of the next point to emit
    for (let k = 1; k < poly.length; k++) {
        const a = poly[k - 1];
        const b = poly[k];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        while (len > 0 && travelled + len >= next) {
            const t = (next - travelled) / len;
            out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
            next += step;
        }
        travelled += len;
    }

    // always end on the path end
    const end = poly[poly.length - 1];
    const last = out[out.length - 1];
    if (Math.hypot(end.x - last.x, end.y - last.y) > 1e-6) {
        out.push({ x: end.x, y: end.y });
    } else {
        out[out.length - 1] = { x: end.x, y: end.y };
    }

    return out;
}
