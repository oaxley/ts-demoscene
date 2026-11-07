/*
 * @file    rotozoom.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Rotozoom effec
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { Display } from "library/core/display";
import { Surface } from "library/gfx/surface";
import { radians } from "library/maths/utils";

//---- globals
const FPS: number = 25;

//----- class
export class Rotozoom extends IAnimation {
    //----- members
    private texture_: Surface; // the texture for the RotoZoom

    private angle_: number; // current rotation angle

    private cos_: number[]; // cos lookup table
    private sin_: number[]; // sin lookup table

    //----- methods
    constructor(display: Display) {
        super("rotozoom", display, FPS);

        // set the vars
        this.angle_ = 0;
        this.cos_ = [];
        this.sin_ = [];

        // load the texture image
        this.texture_ = new Surface();

        // load the lookup tables
        this.computeLUT();
    }

    // prepare the cos/sin tables
    private computeLUT(): void {
        for (let i = 0; i < 360; i++) {
            this.cos_[i] = Math.cos(radians(i));
            this.sin_[i] = Math.sin(radians(i));
        }
    }

    // load the assets
    protected init(): Promise<unknown> {
        return this.texture_.loadImage("/images/assets/ts-rotozoom.texture.jpg");
    }

    // update the animation
    protected update(): void {
        // height of the texture
        const height = this.texture_.height;

        // cosinus / sinus lookup
        const cs: number = this.cos_[this.angle_];
        const sn: number = this.sin_[this.angle_];

        const w = this.display_.width;
        const h = this.display_.height;
        const src = this.texture_.data32;
        const dst = this.display_.surface.data32;
        const zoom = sn + 1;

        // go through all the pixels on the screen
        let addr = 0;
        for (let y: number = 0; y < h; y++) {
            for (let x: number = 0; x < w; x++) {
                /* apply the rotation to the screen pixels:
                 * x' = x * cos - y * sin
                 * y' = x * sin + y * cos
                 * we multiply by (sin + 1) to have a nice zoom effect
                 */
                const xb: number = Math.floor((x * cs - y * sn) * zoom);
                const yb: number = Math.floor((x * sn + y * cs) * zoom);

                /* convert the coordinate to the texture coordinate */
                const u: number = xb & 0xff;
                let v: number = yb % height;

                while (v < 0) {
                    v += height;
                }

                // copy the texel (texture is 256 pixels wide) to display surface
                dst[addr++] = src[u + (v << 8)];
            }
        }
        // increase the rotation angle
        this.angle_ = (this.angle_ + 1) % 360;
    }

    // render the animation on screen
    protected render(): void {
        // flip the back-buffer onto the screen
        this.display_.draw();
    }
}
