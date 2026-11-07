/*
 * @file    plasma.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Plasma effect
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { Display } from "library/core/display";
import { Palette } from "library/color/palette";
import { Color } from "library/color/color";
import { COLOR_MODEL } from "library/color/basecolor";
import { map } from "library/maths/utils";

//----- class
export class Plasma extends IAnimation {
    //----- members
    private palette_: Palette;
    private cols_: Float64Array; // per-column values (scratch)

    //----- methods
    constructor(display: Display) {
        super("plasma", display);

        // set the vars
        this.palette_ = new Palette();
        this.cols_ = new Float64Array(display.width);

        // create the 256 colors palette
        this.createPalette();
    }

    // create the color palette for the plasma
    private createPalette(): void {
        this.palette_ = new Palette();
        for (let i = 0; i < 256; i++) {
            let r = map(Math.sin((Math.PI * i) / 16.0), -1, 1, 0, 255);
            let g = map(Math.sin((Math.PI * i) / 128.0), -1, 1, 0, 255);
            let b = 0;

            this.palette_.setColor(i, new Color(COLOR_MODEL.RGBA, r, g, b));
        }
    }

    // update the animation
    protected update(timestamp: number): void {
        const w = this.display_.width;
        const h = this.display_.height;
        const data32 = this.display_.surface.data32;
        const lut = this.palette_.toUint32Array();

        let time = timestamp / 500;

        // values depending only on the time / on the column
        const sx = 0.5 * Math.sin(time / 7);
        const sy = 0.5 * Math.cos(time / 5);
        const cols = this.cols_;
        for (let x = 0; x < w; x++) {
            const dx = -0.5 + x / w;
            cols[x] = Math.sin(dx * 10 + time);
        }

        let addr = 0;
        for (let y = 0; y < h; y++) {
            const dy = -0.5 + y / h;
            const cy = dy + sy;
            const cy2 = cy * cy;
            const dy2 = dy * dy;

            for (let x = 0; x < w; x++) {
                const dx = -0.5 + x / w;
                const cx = dx + sx;

                let v = cols[x];
                v += Math.sin(Math.sqrt(75 * (cx * cx + cy2) + 1 + time));
                v += Math.cos(Math.sqrt(dx * dx + dy2) - time);
                v /= 3;

                let index = Math.floor(128 + 128 * v);
                if (index > 255) index = 255;

                data32[addr++] = lut[index];
            }
        }
    }

    // render the animation on screen
    protected render(time?: number): void {
        // flip the back-buffer onto the screen
        this.display_.draw();
    }
}
