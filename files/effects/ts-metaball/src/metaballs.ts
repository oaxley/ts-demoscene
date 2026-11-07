/*
 * @file    metaballs.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Metaballs effect
 */

//----- imports
import { IAnimation } from "library/core/animation";

import { Display } from "library/core/display";
import { Palette } from "library/color/palette";
import { Color } from "library/color/color";
import { COLOR_MODEL } from "library/color/basecolor";

//----- globals
const RADIUS: number = 60;
const RADIUS_INCREASE: number = 40;
const NUM_PARTICULES: number = 10;
const MAX_VELOCITY_X: number = 5;
const MAX_VELOCITY_Y: number = 5;
const COEFF: number = 40;

//----- interfaces
interface MetaParticule {
    x: number; // X position
    y: number; // Y position
    vx: number; // X velocity
    vy: number; // Y velocity
    r: number; // Radius
}

//----- class
export class Metaballs extends IAnimation {
    //----- members
    private palette_: Palette;
    private metaballs_: MetaParticule[];
    private dx2_: Float64Array; // squared X distances (scratch)
    private dy2_: Float64Array; // squared Y distances (scratch)
    private cr_: Float64Array; // COEFF * radius (scratch)

    //----- methods
    constructor(display: Display) {
        super("metaballs", display);

        // set the vars
        this.palette_ = new Palette();
        this.metaballs_ = [];
        this.dx2_ = new Float64Array(NUM_PARTICULES * display.width);
        this.dy2_ = new Float64Array(NUM_PARTICULES);
        this.cr_ = new Float64Array(NUM_PARTICULES);

        // create the grayscale palette
        this.createPalette();

        // create the metaballs particules
        this.createParticules();
    }

    // ease function
    private ease(x: number): number {
        return x * x * x;
    }

    // create a grayscale palette
    private createPalette(): void {
        for (let index = 0; index < 256; index++) {
            let v = Math.floor(255.0 * this.ease(index / 256.0));
            this.palette_.setColor(index, new Color(COLOR_MODEL.RGBA, v, v, v));
        }
    }

    // create the metaballs particules
    private createParticules(): void {
        for (let i = 0; i < NUM_PARTICULES; i++) {
            this.metaballs_.push({
                x: Math.floor(this.width_ * Math.random()),
                y: Math.floor(this.height_ * Math.random()),
                vx: MAX_VELOCITY_X * Math.random(),
                vy: MAX_VELOCITY_Y * Math.random(),
                r: Math.floor(RADIUS + RADIUS_INCREASE * Math.random()),
            });
        }
    }

    // update the animation
    protected update(): void {
        // move the particules around
        for (let k = 0; k < NUM_PARTICULES; k++) {
            this.metaballs_[k].x += this.metaballs_[k].vx;
            this.metaballs_[k].y += this.metaballs_[k].vy;

            if (this.metaballs_[k].x < 0 || this.metaballs_[k].x > this.width_)
                this.metaballs_[k].vx = -this.metaballs_[k].vx;

            if (this.metaballs_[k].y < 0 || this.metaballs_[k].y > this.height_)
                this.metaballs_[k].vy = -this.metaballs_[k].vy;
        }
    }

    // render the animation on screen
    protected render(): void {
        const w = this.width_;
        const h = this.height_;
        const data32 = this.display_.surface.data32;
        const lut = this.palette_.toUint32Array();
        const balls = this.metaballs_;

        // squared X distances for each particule / column, and COEFF * radius
        const dx2 = this.dx2_;
        const dy2 = this.dy2_;
        const cr = this.cr_;
        for (let k = 0; k < NUM_PARTICULES; k++) {
            const mx = balls[k].x;
            for (let x = 0; x < w; x++) {
                dx2[k * w + x] = (x - mx) * (x - mx);
            }
            cr[k] = COEFF * balls[k].r;
        }

        // compute the effect
        let addr = 0;
        for (let y = 0; y < h; y++) {
            for (let k = 0; k < NUM_PARTICULES; k++) {
                const my = balls[k].y;
                dy2[k] = (y - my) * (y - my);
            }

            for (let x = 0; x < w; x++) {
                // compute the interference between each particules
                let sum = 0;
                for (let k = 0; k < NUM_PARTICULES; k++) {
                    let d = Math.sqrt(dx2[k * w + x] + dy2[k]);
                    sum += Math.floor(cr[k] / d);
                }

                if (sum > 255) sum = 255;

                // set the pixel with the associated color from the palette
                data32[addr++] = lut[sum];
            }
        }

        // flip the back-buffer onto the screen
        this.display_.draw();
    }
}
