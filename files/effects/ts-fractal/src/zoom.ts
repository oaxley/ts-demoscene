/*
 * @file    zoom.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Zoom timeline and keyframe geometry of the Fractal effect
 *
 *          Keyframe k+1 is keyframe k scaled by `ratio` and turned by
 *          `stepAngle` around the pivot pixel. At zoom level z = k + f, the
 *          screen shows keyframe k scaled by ratio^f and turned by f.stepAngle.
 *          Pixel coordinates have y going down; angles are counter-clockwise
 *          in the complex plane (imaginary axis up).
 */

//----- imports
import { KEYFRAMES } from "./keyframes";

//----- types
export type Keyframes = typeof KEYFRAMES;

// durations of the animation parts, in frames
export interface Timeline {
    hold: number; // full set shown before the zoom
    zoom: number; // zoom from keyframe 0 to the last keyframe
    ease: number; // speed ramp at the start and at the end of the zoom
    fade: number; // crossfade from the last keyframe back to the first
}

// position in the animation
export interface Phase {
    z: number; // zoom level, 0 .. levels
    fade: number; // crossfade to keyframe 0, 0 .. 1
}

//----- globals
const LEVELS = KEYFRAMES.count - 1;

// one doubling every 1.5 s at 60 fps
export const TIMELINE: Timeline = { hold: 120, zoom: LEVELS * 90, ease: 60, fade: 60 };

//----- functions

/* zoom level and crossfade for a frame
 *
 * The zoom speed ramps up linearly during `ease` frames, stays constant, then
 * ramps down to stop exactly on the last level.
 */
export function phaseAt(frame: number, t: Timeline, levels: number): Phase {
    const cycle = t.hold + t.zoom + t.fade;
    const i = ((frame % cycle) + cycle) % cycle;

    if (i < t.hold) {
        return { z: 0, fade: 0 };
    }
    if (i >= t.hold + t.zoom) {
        return { z: levels, fade: (i - t.hold - t.zoom) / t.fade };
    }

    const u = i - t.hold;
    const v = levels / (t.zoom - t.ease); // cruise speed (levels per frame)
    let z: number;
    if (u < t.ease) {
        z = (v * u * u) / (2 * t.ease);
    } else if (u <= t.zoom - t.ease) {
        z = v * (u - t.ease / 2);
    } else {
        const r = t.zoom - u;
        z = levels - (v * r * r) / (2 * t.ease);
    }
    return { z, fade: 0 };
}

/* palette shift at zoom level z
 *
 * The last keyframe's indices are the first one's plus colourOffset: shift
 * them back progressively, the short way round the 255 colours.
 */
export function colourShift(z: number, kf: Keyframes): number {
    const offset = kf.colourOffset > 127.5 ? kf.colourOffset - 255 : kf.colourOffset;
    return z === 0 ? 0 : (-offset * z) / (kf.count - 1);
}

// shifted palette index (0 = inside the set, never shifted)
export function paletteIndex(v: number, shift: number): number {
    if (v === 0) {
        return 0;
    }
    return 1 + ((((v - 1 + Math.round(shift)) % 255) + 255) % 255);
}

/* keyframe k pixel shown by a screen pixel at zoom fraction f
 *
 * The screen covers the whole keyframe at f = 0 (pixel centres aligned).
 */
export function screenToKeyframe(sx: number, sy: number, f: number, kf: Keyframes, screenW: number): [number, number] {
    const s = kf.width / screenW;
    const ux = (sx + 0.5) * s - 0.5 - kf.pivot.x;
    const uy = (sy + 0.5) * s - 0.5 - kf.pivot.y;
    const a = f * kf.stepAngle;
    const c = Math.cos(a) / Math.pow(kf.ratio, f);
    const n = Math.sin(a) / Math.pow(kf.ratio, f);
    return [kf.pivot.x + ux * c + uy * n, kf.pivot.y + uy * c - ux * n];
}

// keyframe k+1 pixel of a keyframe k pixel
export function nextKeyframe(kx: number, ky: number, kf: Keyframes): [number, number] {
    const dx = kx - kf.pivot.x;
    const dy = ky - kf.pivot.y;
    const c = Math.cos(kf.stepAngle) * kf.ratio;
    const n = Math.sin(kf.stepAngle) * kf.ratio;
    return [kf.pivot.x + dx * c - dy * n, kf.pivot.y + dx * n + dy * c];
}
