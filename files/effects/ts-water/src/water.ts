/*
 * @file    water.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Water effect in Typescript
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { States } from "library/core/manager";
import { Display } from "library/core/display";

import { Surface } from "library/gfx/surface";


//----- globals
const BORDER_SIZE = 10;         // border size to prevent the wave to be outside
const WAVE_MIN = 100;           // minimum wave height
const WAVE_MAX = 200;           // maximum wave height


//----- class
export class Water extends IAnimation {

    //----- members
    private image_: Surface;

    private state1_: Array<number>;
    private state2_: Array<number>;
    private state_: number;


    //----- methods
    constructor(display: Display) {
        super('water', display);

        // set the vars
        this.image_ = new Surface();

        let bsize    = this.width_ * this.height_;
        this.state1_ = new Array(bsize).fill(0);
        this.state2_ = new Array(bsize).fill(0);
        this.state_  = 0;
    }

    // select the current/previous buffer
    private states():  [number[], number[]] {
        let cur = (this.state_ == 0) ? this.state1_ : this.state2_;
        let old = (this.state_ == 0) ? this.state2_ : this.state1_;

        return [ cur, old ];
    }

    // add rain
    private rain(): void {
        // compute a random location on the screen (not to close to the borders)
        const border_min = BORDER_SIZE >> 1;
        const border_max = BORDER_SIZE;

        let x = Math.floor(border_min + (this.width_ - border_max) * Math.random());
        let y = Math.floor(border_min + (this.height_ - border_max) * Math.random());

        // wave perturbation
        let p = Math.floor(WAVE_MIN + WAVE_MAX * Math.random());

        // retrieve the current state
        let cur = this.states()[0];

        // create the wave at the position defined in the current state buffer
        let offset = x + y * this.width_;

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

    // update the animation
    protected update(time?: number): void {
        if (!this.isAnimated)
            return;

        // select the current states
        let [cur, old] = this.states();

        // select src and dst images
        let src_data = this.image_.image;
        let dst_data = this.display_.surface.image;

        // compute the effect
        for (let y = 1; y < this.height_ - 1; y++) {
            let y_offset = y * this.width_;
            for (let x = 1; x < this.width_ - 1; x++) {
                let x_offset = y_offset + x;

                // compute the current value at (x, y) by adding surrounding values
                cur[x_offset] = ((
                    old[x_offset - 1] +
                    old[x_offset + 1] +
                    old[x_offset - this.width_] +
                    old[x_offset + this.width_]
                ) >> 1) - cur[x_offset];

                // damp the value along the time
                cur[x_offset] -= cur[x_offset] >> 7;

                // compute the refraction / texture coordinates by cheating (a bit)
                let r = 1024 - cur[x_offset];
                let a = this.width_ + Math.floor((x - this.width_) * r / 1024)
                let b = this.height_ + Math.floor((y - this.height_) * r / 1024);

                if (a >= this.width_)
                    a = this.width_ - 1;
                if (a < 0)
                    a = 0;

                if (b >= this.height_)
                    b = this.height_ - 1;
                if (b < 0)
                    b = 0;

                // retrieve the correct texture pixel
                let t_offset = (b * this.width_) + a;
                dst_data.data[(x_offset << 2) + 0] = src_data.data[(t_offset << 2) + 0];
                dst_data.data[(x_offset << 2) + 1] = src_data.data[(t_offset << 2) + 1];
                dst_data.data[(x_offset << 2) + 2] = src_data.data[(t_offset << 2) + 2];
                dst_data.data[(x_offset << 2) + 3] = src_data.data[(t_offset << 2) + 3];
            }
        }
        this.display_.surface.image = dst_data;
        this.state_ = (this.state_ + 1) & 1;
    }

    // render the animation onto the screen
    protected render(time?: number): void {
        if (!this.isAnimated)
            return;

        this.display_.draw();

        // add a new rain droplet every 10 frames
        if (this.frames_ % 10 == 0) {
            this.rain();
        }

        this.frames_++;
    }

    // setup function
    public setup(): void {
        this.image_
            .loadImage('/images/assets/ts-water.asset.png')
            .then(result => {
                // toggle the animation
                this.toggle();

                // set the click handler to pause the animation
                window.onclick = () => {
                    this.toggle();
                };

                console.log('Starting the Water animation');
            });
    }

    // cleanup function
    public cleanup(): void {
    }

    // run the animation
    public run(time: number | undefined): States {
        // update and render the animation
        this.update(time);
        this.render(time);

        // this animation will run indefinitely
        return States.S_RUNNING;
    }
}