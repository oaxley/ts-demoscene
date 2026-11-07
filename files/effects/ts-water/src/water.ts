/*
 * @file    water.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Water effect in Typescript
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { Display } from "library/core/display";

import { Surface } from "library/gfx/surface";

//----- globals
const BORDER_SIZE = 10; // border size to prevent the wave to be outside
const WAVE_MIN = 100; // minimum wave height
const WAVE_MAX = 200; // maximum wave height

//----- class
export class Water extends IAnimation {
    //----- members
    private image_: Surface;

    private state1_: Int32Array;
    private state2_: Int32Array;
    private state_: number;

    //----- methods
    constructor(display: Display) {
        super("water", display);

        // set the vars
        this.image_ = new Surface();

        const bsize = this.width_ * this.height_;
        this.state1_ = new Int32Array(bsize);
        this.state2_ = new Int32Array(bsize);
        this.state_ = 0;
    }

    // select the current/previous buffer
    private states(): [Int32Array, Int32Array] {
        const cur = this.state_ == 0 ? this.state1_ : this.state2_;
        const old = this.state_ == 0 ? this.state2_ : this.state1_;

        return [cur, old];
    }

    // add rain
    private rain(): void {
        // compute a random location on the screen (not to close to the borders)
        const border_min = BORDER_SIZE >> 1;
        const border_max = BORDER_SIZE;

        const x = Math.floor(border_min + (this.width_ - border_max) * Math.random());
        const y = Math.floor(border_min + (this.height_ - border_max) * Math.random());

        // wave perturbation
        const p = Math.floor(WAVE_MIN + WAVE_MAX * Math.random());

        // retrieve the current state
        const cur = this.states()[0];

        // create the wave at the position defined in the current state buffer
        const offset = x + y * this.width_;

        cur[offset] += p;
        cur[offset - this.width_] += p;
        cur[offset + this.width_] += p;

        cur[offset + 1] += p;
        cur[offset + 1 - this.width_] += p;
        cur[offset + 1 + this.width_] += p;

        cur[offset - 1] += p;
        cur[offset - 1 - this.width_] += p;
        cur[offset - 1 + this.width_] += p;

        cur[offset + 2] += p;
        cur[offset + 2 - this.width_] += p;
        cur[offset + 2 + this.width_] += p;

        cur[offset - 2] += p;
        cur[offset - 2 - this.width_] += p;
        cur[offset - 2 + this.width_] += p;
    }

    // load the assets
    protected init(): Promise<unknown> {
        return this.image_.loadImage("/images/assets/ts-water.background.png");
    }

    // update the animation
    protected update(): void {
        // select the current states
        const [cur, old] = this.states();

        // select src and dst frame buffers
        const src = this.image_.data32;
        const dst = this.display_.surface.data32;

        // compute the effect
        for (let y = 1; y < this.height_ - 1; y++) {
            const y_offset = y * this.width_;
            for (let x = 1; x < this.width_ - 1; x++) {
                const x_offset = y_offset + x;

                // compute the current value at (x, y) by adding surrounding values
                cur[x_offset] =
                    ((old[x_offset - 1] +
                        old[x_offset + 1] +
                        old[x_offset - this.width_] +
                        old[x_offset + this.width_]) >>
                        1) -
                    cur[x_offset];

                // damp the value along the time
                cur[x_offset] -= cur[x_offset] >> 7;

                // compute the refraction / texture coordinates by cheating (a bit)
                const r = 1024 - cur[x_offset];
                let a = this.width_ + Math.floor(((x - this.width_) * r) / 1024);
                let b = this.height_ + Math.floor(((y - this.height_) * r) / 1024);

                if (a >= this.width_) a = this.width_ - 1;
                if (a < 0) a = 0;

                if (b >= this.height_) b = this.height_ - 1;
                if (b < 0) b = 0;

                // retrieve the correct texture pixel
                dst[x_offset] = src[b * this.width_ + a];
            }
        }
        this.state_ = (this.state_ + 1) & 1;
    }

    // render the animation onto the screen
    protected render(): void {
        this.display_.draw();

        // add a new rain droplet every 10 frames
        if (this.frames_ % 10 == 0) {
            this.rain();
        }
    }
}
