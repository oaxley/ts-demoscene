/*
 * @file    rotozoom.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Rotozoom effec
 */

//----- imports
import { Animation } from "library/core/animation";
import { Display } from "library/core/display";
import { Surface } from "library/core/surface";
import { radians } from "library/maths/utils";


//---- globals
const FPS: number = 25;
const TICKS: number = 1000 / FPS;


//----- class
export class Rotozoom extends Animation {

    //----- members
    private display_  : Display;
    private image_    : Surface;

    private angle_: number;                         // current rotation angle

    private cos_ : number[];                        // cos lookup table
    private sin_ : number[];                        // sin lookup table

    private lastTs_: number;                        // last timestamp


    //----- methods
    constructor(display: Display) {
        super();

        // set the vars
        this.display_ = display;
        this.angle_ = 0;
        this.lastTs_ = null;

        // load the texture image
        let img = new Image();
        img.onload = () => {
            this.image_ = new Surface({width: img.width, height: img.height});
            this.image_.context.drawImage(img, 0, 0);
        };
        img.src = '/images/ts-rotozoom.asset.jpg';

        // load the lookup tables
        this.computeLUT();
    }

    // prepare the cos/sin tables
    private computeLUT(): void {
        this.cos_ = [];
        this.sin_ = [];

        for (let i = 0; i < 360; i++) {
            this.cos_[i] = Math.cos(radians(i));
            this.sin_[i] = Math.sin(radians(i));
        }
    }

    // run the animation
    public run(): void {
        console.log("Starting the Rotozoom animation.");

        // toggle the animation
        this.toggle();

        // run the animation on the next frame
        requestAnimationFrame(this.main.bind(this));
    }

    // update the animation
    protected update(timestamp: number): void {
        if (!this.isAnimated)
            return;

        // retrieve the image / backbuffer data
        let srcdata = this.image_.data;
        let dstdata = this.display_.surface.data;

        // height of the texture
        const height: number = this.image_.canvas.height;

        // cosinus / sinus lookup
        const cs: number = this.cos_[this.angle_];
        const sn: number = this.sin_[this.angle_];

        // offset in the destination data (display surface)
        let dstoff: number = 0;

        // go through all the pixels on the screen
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
                let u: number = xb & 0xff;
                let v: number = yb % height;

                while (v < 0) {
                    v += height;
                }

                // offset in the texture (256x256)
                let srcoff: number = (u + (v << 8)) << 2;

                // copy the rgba values to display surface
                dstdata.data[dstoff++] = srcdata.data[srcoff++];
                dstdata.data[dstoff++] = srcdata.data[srcoff++];
                dstdata.data[dstoff++] = srcdata.data[srcoff++];
                dstdata.data[dstoff++] = srcdata.data[srcoff++];
            }
        }

        // put the pixels back
        this.display_.surface.data = dstdata;

        // increase the rotation angle
        this.angle_ = (this.angle_ + 1) % 360;
    }

    // render the animation on screen
    protected render(timestamp: number): void {
        if (!this.isAnimated)
            return;

        // flip the back-buffer onto the screen
        this.display_.draw();

        // increase frames count
        this.frames_++;
    }

    // main animation function
    protected main(timestamp: number): void {
        // initialize the value on first call
        if (this.lastTs_ == null) {
            this.lastTs_ = timestamp;
        }

        // ensure the animation is runned at constant frame rate
        if ( (timestamp - this.lastTs_) > TICKS ) {
            this.update(timestamp);
            this.render(timestamp);

            this.lastTs_ = timestamp
        }
        requestAnimationFrame(this.main.bind(this));
    }
}