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
    private texture_: Surface;                      // the texture for the RotoZoom

    private angle_: number;                         // current rotation angle

    private cos_ : number[];                        // cos lookup table
    private sin_ : number[];                        // sin lookup table



    //----- methods
    constructor(display: Display) {
        super('rotozoom', display, FPS);

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
        return this.texture_.loadImage('/images/assets/ts-rotozoom.texture.jpg');
    }

    // update the animation
    protected update(timestamp: number): void {
        // height of the texture
        const height = this.texture_.height;

        // cosinus / sinus lookup
        const cs: number = this.cos_[this.angle_];
        const sn: number = this.sin_[this.angle_];

        // go through all the pixels on the screen
        this.display_.surface.address = 0;
        for (let y: number = 0; y < this.display_.height; y++) {
            for (let x: number = 0; x < this.display_.width; x++) {

                /* apply the rotation to the screen pixels:
                 * x' = x * cos - y * sin
                 * y' = x * sin + y * cos
                 * we multiply by (sin + 1) to have a nice zoom effect
                 */
                let xb: number = Math.floor((x * cs - y * sn) * (sn + 1));
                let yb: number = Math.floor((x * sn + y * cs) * (sn + 1));

                /* convert the coordinate to the texture coordinate */
                let u: number = Math.floor(xb & 0xff);
                let v: number = Math.floor(yb % height);

                while (v < 0) {
                    v += height;
                }

                // offset in the texture (256x256)
                let srcoff: number = (u + (v << 8));
                this.texture_.address = srcoff;

                // copy the rgba values to display surface
                this.display_.surface.streamW = this.texture_.streamW;
            }
        }
        // increase the rotation angle
        this.angle_ = (this.angle_ + 1) % 360;
    }

    // render the animation on screen
    protected render(timestamp: number): void {
        // flip the back-buffer onto the screen
        this.display_.draw();
    }
}