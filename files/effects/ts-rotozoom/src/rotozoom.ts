/*
 * @file    rotozoom.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Rotozoom effec
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { States } from "library/core/manager";
import { Display } from "library/core/display";
import { Surface } from "library/gfx/surface";
import { radians } from "library/maths/utils";


//---- globals
const FPS: number = 25;
const TICKS: number = 1000 / FPS;


//----- class
export class Rotozoom extends IAnimation {

    //----- members
    private image_: Surface;

    private angle_: number;                         // current rotation angle

    private cos_ : number[];                        // cos lookup table
    private sin_ : number[];                        // sin lookup table

    private lastTs_: number;                        // last timestamp


    //----- methods
    constructor(display: Display) {
        super('rotozoom', display);

        // set the vars
        this.angle_ = 0;
        this.lastTs_ = -1;
        this.cos_ = [];
        this.sin_ = [];

        // load the texture image
        this.image_ = new Surface();
        this.image_.loadImage('/images/assets/ts-rotozoom.asset.jpg');

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

    // update the animation
    protected update(timestamp: number): void {
        if (!this.isAnimated)
            return;

        // retrieve the image / backbuffer data
        let srcdata = this.image_.data;

        // activate the frame buffer
        this.display_.surface.framebuffer = true;
        this.display_.surface.frameAddr = 0

        // height of the texture
        const height: number = this.image_!.canvas.height;

        // cosinus / sinus lookup
        const cs: number = this.cos_[this.angle_];
        const sn: number = this.sin_[this.angle_];

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
                this.display_.surface.frameStream = srcdata.data[srcoff++]
                this.display_.surface.frameStream = srcdata.data[srcoff++]
                this.display_.surface.frameStream = srcdata.data[srcoff++]
                this.display_.surface.frameStream = srcdata.data[srcoff++]
            }
        }

        // put the pixels back
        this.display_.surface.framebuffer = false;

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

    // setup function
    public setup(): void {
        // toggle the animation
        this.toggle();

        // set the click handler to pause the animation
        window.onclick = () => {
            this.toggle();
        }

        console.log("Starting the Rotozoom animation.");
    }

    // cleanup function
    public cleanup(): void {
    }

    // run the animation
    public run(time: number): States {

        // initialize the value on first call
        if (this.lastTs_ == -1) {
            this.lastTs_ = time;
        }

        // ensure the animation is runned at constant frame rate
        if ( (time - this.lastTs_) > TICKS ) {
            this.update(time);
            this.render(time);

            this.lastTs_ = time
        }

        // this animation will run indefinitely
        return States.S_RUNNING;
    }
}