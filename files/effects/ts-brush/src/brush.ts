/*
 * @file    brush.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Brush Ink effect: a spring-driven brush (Hooke's law) writing 生きがい
 *
 * Based on BUN's sketch (https://openprocessing.org/sketch/755877): the brush is
 * attached to the pen by a spring and slowed down by friction, and its width
 * shrinks with its speed. Here the pen is not the mouse: it replays the
 * KanjiVG strokes of the word, one after the other.
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { Display } from "library/core/display";
import { Point2D } from "library/core/interfaces";
import { RGBA } from "library/color/RGBA";
import { fadeToColor } from "library/gfx/pixels";
import { Stroke, layoutWord, WORD, KANJI_GRID } from "./kanji";
import { samplePath } from "library/maths/svgpath";
import { smoothstep } from "library/maths/utils";

//----- globals
export const FPS = 25;

// brush (BUN's values for the spring and the friction)
const SPRING = 0.4; // spring constant (larger = stiffer spring)
const FRICTION = 0.45; // velocity kept each frame (smaller = more friction)
const THIN = 1.2; // how much the speed thins the brush (our pen is slower than a mouse)
const BRUSH_SIZE = 14; // brush width when still (pixels)
const DIFF = BRUSH_SIZE * 0.2; // bristle offset (BUN: 8 for a 40 brush)
const SPLIT = 20; // sub-steps per frame
const INK_ALPHA = 0.3; // opacity of one stamp (overlaps darken, fast parts stay lighter)

// pen
const STEP = 1; // distance between two stroke points (pixels)
const PEN_SPEED = 8; // average pen speed (points per frame)
const MIN_FRAMES = 6; // shortest stroke duration (frames)
const SETTLE = 3; // frames with the pen parked at the end of a stroke
const LINK_SPEED = 2; // the pen goes this much faster between two strokes (brush down)
const LINK_SIZE = 0.7; // brush width during a link (the brush barely touches the paper)
const LINK_CURVE = 0.4; // how far a link follows the stroke directions before bending (x its length)
const LINK_BOW = 0.35; // upward arch of a long link (x its length beyond LINK_BOW_MIN)
const LINK_BOW_MIN = 60; // links shorter than this (pixels) are not arched
const LINK_ALPHA = 0.22; // ink opacity during a link (almost dry brush)

// timeline (frames)
const LIFT_CHAR = 10; // pause after the last stroke, before the seal
const HOLD = 75; // the word stays on screen (3 s)
const FADE = 25; // fade back to paper (1 s)

// colours
const PAPER = RGBA.toUInt32(0xf2, 0xea, 0xd8);
const INK = RGBA.toUInt32(0x1a, 0x1a, 0x1a);
const SEAL = RGBA.toUInt32(0xb2, 0x22, 0x22);
const SEAL_SIZE = 36;

//----- interfaces
// state of the brush
export interface BrushState {
    x: number; // position
    y: number;
    vx: number; // velocity
    vy: number;
    v: number; // smoothed speed
    r: number; // width
}

// a stroke placed on the timeline
interface Slot {
    stroke: Stroke;
    start: number; // first frame
    duration: number; // frames for the pen to walk the stroke
    down: boolean; // true = the brush is put down at the start (false = it comes from the previous slot)
    link: boolean; // true = fast move from a character to the next (constant speed)
}

// the whole cycle
interface Timeline {
    slots: Slot[];
    seal: number; // frame where the seal is stamped
    fade: number; // first frame of the fade
    length: number; // cycle length (frames)
}

//----- functions

/* one frame of BUN's brush: spring toward the pen, friction, speed-driven width
 *
 * Args:
 *      s     : the brush state (updated)
 *      penX/Y: the pen position
 *      size  : brush width when still
 */
export function brushStep(s: BrushState, penX: number, penY: number, size: number): void {
    // Hooke's law: acceleration proportional to the distance, then friction
    s.vx = (s.vx + (penX - s.x) * SPRING) * FRICTION;
    s.vy = (s.vy + (penY - s.y) * SPRING) * FRICTION;

    // smoothed speed (BUN: v += len - v; v *= 0.6)
    s.v = (s.v + (Math.sqrt(s.vx * s.vx + s.vy * s.vy) - s.v)) * 0.6;

    // faster = thinner
    s.r = size - s.v * THIN;

    s.x += s.vx;
    s.y += s.vy;
}

/* eased pen position along a stroke (slow start, fast middle, slow end)
 *
 * Args:
 *      t: time along the stroke, in [0, 1]
 *      n: number of points of the stroke
 *
 * Returns:
 *      the (fractional) point index, in [0, n-1]
 */
export function penIndex(t: number, n: number): number {
    const c = Math.min(Math.max(t, 0), 1);
    return (n - 1) * smoothstep(c);
}

// unit direction between two points of a stroke (5 points apart, clamped)
function direction(pts: Point2D[], a: number, b: number): Point2D {
    const i = Math.min(Math.max(a, 0), pts.length - 1);
    const j = Math.min(Math.max(b, 0), pts.length - 1);
    const dx = pts[j].x - pts[i].x;
    const dy = pts[j].y - pts[i].y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
}

/* curved link from the end of a stroke to the start of the next one
 *
 * A cubic Bézier that leaves in the direction the stroke ends and arrives in
 * the direction the next stroke starts, like a hand moving to the next stroke.
 */
export function linkPath(from: Point2D[], to: Point2D[]): Point2D[] {
    const a = from[from.length - 1];
    const b = to[0];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const k = len * LINK_CURVE;
    const out = direction(from, from.length - 6, from.length - 1);
    const into = direction(to, 0, 5);

    // bow: perpendicular to the chord, on the upper side, only for long links
    const bow = LINK_BOW * Math.max(0, len - LINK_BOW_MIN);
    let nx = len > 0 ? -(b.y - a.y) / len : 0;
    let ny = len > 0 ? (b.x - a.x) / len : 0;
    if (ny > 0) {
        nx = -nx;
        ny = -ny;
    }
    const c1 = { x: a.x + out.x * k + nx * bow, y: a.y + out.y * k + ny * bow };
    const c2 = { x: b.x - into.x * k + nx * bow, y: b.y - into.y * k + ny * bow };
    return samplePath(`M${a.x},${a.y}C${c1.x},${c1.y},${c2.x},${c2.y},${b.x},${b.y}`, STEP);
}

// place every stroke on the timeline
function timeline(strokes: Stroke[]): Timeline {
    const slots: Slot[] = [];
    let f = 0;
    let down = true;
    strokes.forEach((stroke, i) => {
        const duration = Math.max(MIN_FRAMES, Math.ceil(stroke.points.length / PEN_SPEED));
        slots.push({ stroke, start: f, duration, down, link: false });
        f += duration;
        down = true;

        const next = strokes[i + 1];
        if (next === undefined) {
            f += SETTLE + LIFT_CHAR;
        } else {
            // the brush stays down and swings fast to the first point of the next stroke
            const points = linkPath(stroke.points, next.points);
            const n = points.length;
            const linkDuration = Math.max(2, Math.ceil(n / (PEN_SPEED * LINK_SPEED)));
            slots.push({
                stroke: { char: stroke.char, points },
                start: f,
                duration: linkDuration,
                down: false,
                link: true,
            });
            f += linkDuration + SETTLE; // the brush catches up with the pen before the stroke
            down = false;
        }
    });
    return { slots, seal: f, fade: f + 1 + HOLD, length: f + 1 + HOLD + FADE };
}

/* length of one cycle (write, seal, hold, fade) in frames
 *
 * Args:
 *      width, height: screen size
 */
export function cycleFrames(width: number, height: number): number {
    return timeline(layoutWord(width, height, STEP)).length;
}

//----- class
export class Brush extends IAnimation {
    //----- members
    private timeline_: Timeline; // strokes and phases of a cycle
    private slot_: number; // index of the current stroke slot
    private brush_: BrushState; // the brush
    private sealPos_: Point2D; // top-left corner of the seal
    private sealMark_: Point2D[][]; // small 生 drawn in the seal

    //----- methods
    constructor(display: Display) {
        super("brush", display, FPS);

        this.timeline_ = timeline(layoutWord(display.width, display.height, STEP));
        this.slot_ = 0;
        this.brush_ = { x: 0, y: 0, vx: 0, vy: 0, v: 0, r: BRUSH_SIZE };

        // seal under the bottom-right corner of the last character
        const all = this.timeline_.slots.flatMap((s) => s.stroke.points);
        const right = Math.max(...all.map((p) => p.x));
        const bottom = Math.max(...all.map((p) => p.y));
        this.sealPos_ = { x: Math.round(right - SEAL_SIZE), y: Math.round(bottom + 14) };

        // the mark of the seal: 生, scaled into the seal
        const k = (SEAL_SIZE - 12) / KANJI_GRID;
        this.sealMark_ = WORD[0].map((d) =>
            samplePath(d, 0.5 / k).map((p) => ({ x: this.sealPos_.x + 6 + p.x * k, y: this.sealPos_.y + 6 + p.y * k })),
        );
    }

    // start on a blank sheet of paper
    protected init(): void {
        this.display_.surface.data32.fill(PAPER);
    }

    // put the brush down at the start of a stroke
    private penDown(p: Point2D): void {
        const b = this.brush_;
        b.x = p.x;
        b.y = p.y;
        b.vx = b.vy = b.v = 0;
        b.r = BRUSH_SIZE;
    }

    // one frame of the brush following the pen, stamping ink on the way
    private paint(pen: Point2D, size: number, alpha: number): void {
        const s = this.display_.surface;
        const b = this.brush_;
        const x0 = b.x;
        const y0 = b.y;
        let rr = b.r; // drawn width, eases toward the new width (BUN's oldR)

        brushStep(b, pen.x, pen.y, size);

        for (let k = 1; k <= SPLIT; k++) {
            const x = x0 + ((b.x - x0) * k) / SPLIT;
            const y = y0 + ((b.y - y0) * k) / SPLIT;
            rr = Math.max(1, rr + (b.r - rr) / SPLIT);

            // main stroke and two bristle lines (BUN's offsets)
            s.disc(x, y, (rr + DIFF) / 2, INK, alpha);
            s.disc(x + DIFF * 1.5, y + DIFF * 2, rr / 2, INK, alpha);
            s.disc(x - DIFF, y - DIFF, rr / 2, INK, alpha);
        }
    }

    // pen position on a stroke at a frame of its slot
    private penAt(slot: Slot, frame: number): Point2D {
        const pts = slot.stroke.points;
        const t = frame / (slot.duration - 1);
        const f = slot.link ? (pts.length - 1) * t : penIndex(t, pts.length);
        const i = Math.min(Math.floor(f), pts.length - 2);
        const u = f - i;
        return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * u, y: pts[i].y + (pts[i + 1].y - pts[i].y) * u };
    }

    // stamp the red seal with its small paper-coloured mark
    private stamp(): void {
        const s = this.display_.surface;
        const data32 = s.data32;
        const w = s.width;
        const { x: sx, y: sy } = this.sealPos_;

        for (let y = 0; y < SEAL_SIZE; y++) {
            for (let x = 0; x < SEAL_SIZE; x++) {
                const frame = x >= 3 && x < SEAL_SIZE - 3 && y >= 3 && y < SEAL_SIZE - 3;
                const inner = x >= 5 && x < SEAL_SIZE - 5 && y >= 5 && y < SEAL_SIZE - 5;
                data32[(sy + y) * w + sx + x] = frame && !inner ? PAPER : SEAL;
            }
        }
        for (const stroke of this.sealMark_) {
            for (const p of stroke) {
                s.disc(p.x, p.y, 1.3, PAPER, 0.6);
            }
        }
    }

    // fade every pixel toward the paper (the last step lands exactly on it)
    private fade(remaining: number): void {
        const data32 = this.display_.surface.data32;
        if (remaining <= 1) {
            data32.fill(PAPER);
            return;
        }

        fadeToColor(data32, PAPER, Math.round(256 / remaining));
    }

    // update the animation
    protected update(): void {
        const tl = this.timeline_;
        const f = this.frames_ % tl.length;

        // new cycle
        if (f === 0) {
            this.slot_ = 0;
        }

        if (f >= tl.fade) {
            this.fade(tl.length - f);
            return;
        }
        if (f === tl.seal) {
            this.stamp();
            return;
        }

        // writing: find the slot of this frame (strokes are in order)
        while (this.slot_ < tl.slots.length - 1 && f >= tl.slots[this.slot_ + 1].start) {
            this.slot_++;
        }
        const slot = tl.slots[this.slot_];
        const local = f - slot.start;
        if (local < 0 || local >= slot.duration + SETTLE) {
            return; // brush lifted
        }

        const pen = this.penAt(slot, Math.min(local, slot.duration - 1));
        if (local === 0 && slot.down) {
            this.penDown(pen);
        }
        if (slot.link) {
            this.paint(pen, BRUSH_SIZE * LINK_SIZE, LINK_ALPHA);
        } else {
            this.paint(pen, BRUSH_SIZE, INK_ALPHA);
        }
    }

    // render the animation on the screen
    protected render(): void {
        this.display_.draw();
    }
}
