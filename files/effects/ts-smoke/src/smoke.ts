/*
 * @file    smoke.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Smoke effect in Typescript
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { Display } from "library/core/display";
import { Surface } from "library/gfx/surface";
import { Point2D } from "library/core/interfaces";
import { lerp, smoothstep } from "library/maths/utils";
import { RGBA } from "library/color/RGBA";
import { BAYER4 } from "library/gfx/pixels";

//----- globals
const EDGE_SAMPLE = 8; // background columns used to compute the fill color
const EDGE_FADE = 96; // background columns faded into the fill color
const EDGE_SMOOTH = 24; // vertical smoothing radius of the fill color (lines)

//----- interfaces
// particule parameters
interface Param {
    init: number; // initial value
    amp: number; // amplitude
    freq1: number; // frequency #1
    freq2: number; // frequency #2
}

// trail between 2 particules
interface Trail {
    src: Particule; // src particule
    dst: Particule; // dst particule
    points: number; // number of points between these particules
}

//----- classes
// particule class
class Particule {
    //----- members
    private x_: Param; // parameters to compute the X value
    private y_: Param; // parameters to compute the Y value
    private delay_: number; // delay factor

    //----- methods
    constructor(x: Param, y: Param, delay: number) {
        this.x_ = x;
        this.y_ = y;
        this.delay_ = delay;
    }

    public get delay(): number {
        return this.delay_;
    }

    // return the new position of the particule
    public position(t: number): Point2D {
        return {
            x: this.x_.init + this.x_.amp * Math.cos(this.x_.freq1 * Math.PI * this.x_.freq2 * t),
            y: this.y_.init + this.y_.amp * Math.sin(this.y_.freq1 * Math.PI * this.y_.freq2 * t),
        };
    }
}

// animation class
export class Smoke extends IAnimation {
    //----- members
    private background_: Surface;
    private screen_: Surface; // full-screen background (built once loaded)
    private bgx0: number = 0; // background X start position
    private bgy0: number = 0; // background Y start position

    private particules_: Array<Particule>;
    private trails_: Array<Trail>;

    //----- methods
    // constructor
    constructor(display: Display) {
        super("smoke", display);

        // set the vars
        this.background_ = new Surface();
        this.screen_ = new Surface();
        this.particules_ = new Array(4);
        this.trails_ = new Array(3);
    }

    private setupParticules(): void {
        const cx = this.bgx0 + 137;
        const cy = this.bgy0 + 235;

        let x: Param = { init: cx, amp: 0, freq1: 0, freq2: 0 };
        let y: Param = { init: cy, amp: 0, freq1: 0, freq2: 0 };
        this.particules_[0] = new Particule(x, y, 0);

        x = { init: cx - 5, amp: 5, freq1: 2.25, freq2: 1.0 };
        y = { init: 10, amp: 7, freq1: 5.0, freq2: 1.0 };
        this.particules_[1] = new Particule(x, y, -3.0);

        x = { init: cx - 7, amp: 2.5, freq1: 3.75, freq2: 1.0 };
        y = { init: 22, amp: 5.0, freq1: 2.5, freq2: 1.0 };
        this.particules_[2] = new Particule(x, y, -3.14);

        x = { init: cx - 10, amp: 3.5, freq1: 4.75, freq2: 1.0 };
        y = { init: 17, amp: 9.0, freq1: 7.0, freq2: 1.0 };
        this.particules_[3] = new Particule(x, y, -1.5);

        // create the trails between these particules
        this.trails_[0] = { src: this.particules_[0], dst: this.particules_[1], points: 500 };
        this.trails_[1] = { src: this.particules_[0], dst: this.particules_[2], points: 500 };
        this.trails_[2] = { src: this.particules_[0], dst: this.particules_[3], points: 500 };
    }

    // draw the trails between points
    private drawTrails(t: number): void {
        for (let i = 0; i < this.trails_.length; i++) {
            const src = this.trails_[i].src;
            const dst = this.trails_[i].dst;
            const npt = this.trails_[i].points;

            // gray color gradient
            const gray = 0xe0;
            const delta = (0x30 - gray) / npt;
            const color: RGBA = new RGBA(gray, gray, gray);

            for (let j = 0; j < npt; j++) {
                const tt = j / npt;

                // compute the new position of each point
                const a = src.position(t - src.delay * tt);
                const b = dst.position(t - dst.delay * (1 - tt));

                // create the LERP for these
                const x = lerp(a.x, b.x, tt);
                const y = lerp(a.y, b.y, tt);

                // compute the color at this position
                const v = Math.floor(gray + j * delta);
                color.red = v;
                color.green = v;
                color.blue = v;

                // draw the point
                this.display_.surface.setPixel(Math.floor(x), Math.floor(y), color);
            }
        }
    }

    /* build the full-screen background
     *
     * The picture is on the right side of the screen and its left edge is
     * not pure black: against the black area on the left it showed a visible
     * seam. The left area is filled, line by line, with the (vertically
     * smoothed) color of the picture edge, and the first columns of the
     * picture fade into it.
     */
    private buildScreen(): void {
        const bg = this.background_;
        const bw = bg.width;
        const bh = bg.height;
        const src = bg.data32;

        // average color of the left edge, for each line
        const edge = new Float64Array(bh * 3);
        for (let y = 0; y < bh; y++) {
            for (let x = 0; x < EDGE_SAMPLE; x++) {
                const [r, g, b] = RGBA.fromUInt32(src[y * bw + x]);
                edge[y * 3] += r / EDGE_SAMPLE;
                edge[y * 3 + 1] += g / EDGE_SAMPLE;
                edge[y * 3 + 2] += b / EDGE_SAMPLE;
            }
        }

        // smooth it vertically (no visible lines)
        const fills = new Float64Array(bh * 3);
        for (let y = 0; y < bh; y++) {
            let [r, g, b, n] = [0, 0, 0, 0];
            for (let k = Math.max(0, y - EDGE_SMOOTH); k <= Math.min(bh - 1, y + EDGE_SMOOTH); k++, n++) {
                r += edge[k * 3];
                g += edge[k * 3 + 1];
                b += edge[k * 3 + 2];
            }
            fills[y * 3] = r / n;
            fills[y * 3 + 1] = g / n;
            fills[y * 3 + 2] = b / n;
        }

        // fill the screen, then copy the picture with a faded left edge
        const w = this.display_.width;
        const h = this.display_.height;
        this.screen_ = new Surface({ width: w, height: h });
        const dst = this.screen_.data32;

        for (let y = 0; y < h; y++) {
            const by = y - this.bgy0;
            const inside = by >= 0 && by < bh;
            if (!inside) {
                dst.fill(0, y * w, (y + 1) * w);
                continue;
            }

            const [fr, fg, fb] = [fills[by * 3], fills[by * 3 + 1], fills[by * 3 + 2]];

            // left area: (dithered) fill color
            for (let x = 0; x < Math.min(this.bgx0, w); x++) {
                const t = BAYER4[((y & 3) << 2) | (x & 3)];
                dst[y * w + x] = RGBA.toUInt32(Math.floor(fr + t), Math.floor(fg + t), Math.floor(fb + t));
            }
            for (let x = 0; x < bw; x++) {
                const dx = this.bgx0 + x;
                if (dx < 0 || dx >= w) {
                    continue;
                }

                let value = src[by * bw + x];
                if (x < EDGE_FADE) {
                    // smoothstep from the fill color to the picture
                    const k = smoothstep(x / EDGE_FADE);
                    const [r, g, b] = RGBA.fromUInt32(value);
                    const t = BAYER4[((y & 3) << 2) | (dx & 3)];
                    value = RGBA.toUInt32(
                        Math.floor(lerp(fr, r, k) + t),
                        Math.floor(lerp(fg, g, k) + t),
                        Math.floor(lerp(fb, b, k) + t),
                    );
                }
                dst[y * w + dx] = value;
            }
        }
    }

    // load the assets
    protected init(): Promise<unknown> {
        return this.background_.loadImage("/images/assets/ts-smoke.background.png").then(() => {
            // set the background position
            this.bgx0 = this.display_.width - this.background_.width;
            this.bgy0 = 0;

            // build the full-screen background
            this.buildScreen();

            // setup the particules
            this.setupParticules();
        });
    }

    // update the animation
    protected update(): void {
        // copy the background on the display surface
        this.display_.surface.data32.set(this.screen_.data32);

        // draw the smoke trails
        const t = this.frames_ / 200;
        this.drawTrails(t);
    }
}
