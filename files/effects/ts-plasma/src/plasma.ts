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

//----- constants
const SPEED = 1500; // speed of the plasma animation (ms per cycle)
const SCALE = 10.0; // coordinate scale: higher = smaller pattern (zoomed out)
const AMPLITUDE = 15.0; // amplitude of the plasma value

//----- class
export class Plasma extends IAnimation {
    //----- members
    private palette_: Palette;
    private cols_: Float64Array; // per-column x coordinates (scratch)

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
            const t = map(i, 0, 255, -AMPLITUDE, AMPLITUDE);
            const r = map(Math.cos((t + 0.2)), -1, 1, 0, 255);
            const g = map(Math.cos((t + 0.4)), -1, 1, 0, 255);
            const b = map(Math.cos((t + 0.8)), -1, 1, 0, 255);

            this.palette_.setColor(i, new Color(COLOR_MODEL.RGBA, r, g, b));
        }
    }

    // update the animation
    protected update(timestamp: number): void {
        const w = this.display_.width;
        const h = this.display_.height;
        const data32 = this.display_.surface.data32;
        const lut = this.palette_.toUint32Array();

        const time = timestamp / SPEED;
        const aspect = w / h;

        // phase terms depending only on the time
        const phaseVOffset = 0.1 + 2.4 * time;
        const sinV = Math.sin(0.148 - time);
        const cosH = Math.cos(0.628 + time);
        const phaseHOffset = 0.9 - 0.7 * time;

        const cols = this.cols_;
        for (let x = 0; x < w; x++) {
            cols[x] = (x / w - 0.5) * aspect * SCALE + time * 0.3;
        }

        let addr = 0;
        for (let y = 0; y < h; y++) {
            const uy = (y / h - 0.5) * SCALE + time * 0.3;
            const phaseV = phaseVOffset + Math.cos(uy + sinV);
            const uy2 = uy * uy;

            for (let x = 0; x < w; x++) {
                const ux = cols[x];
                const phaseH = phaseHOffset + Math.sin(ux + cosH);
                const radial = Math.sqrt(ux * ux + uy2);

                const plasma = AMPLITUDE * Math.cos(radial + phaseH) * Math.sin(phaseV + phaseH);

                let index = Math.floor(128 + 128 * (plasma / AMPLITUDE));
                if (index > 255) index = 255;
                if (index < 0) index = 0;

                data32[addr++] = lut[index];
            }
        }
    }
}
