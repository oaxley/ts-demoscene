/*
 * @file    smoke.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Smoke effect in Typescript
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { States } from "library/core/manager";
import { Display } from "library/core/display";
import { Surface } from "library/gfx/surface";
import { Point2D } from "library/core/interfaces";
import { lerp } from "library/maths/utils";
import { RGBA } from "library/color/RGBA";


//----- globals


//----- interfaces
// particule parameters
interface Param {
    init : number;      // initial value
    amp  : number;      // amplitude
    freq1: number;      // frequency #1
    freq2: number;      // frequency #2
}

// trail between 2 particules
interface Trail {
    src: Particule;     // src particule
    dst: Particule;     // dst particule
    points: number;     // number of points between these particules
}

//----- classes
// particule class
class Particule {
    //----- members
    private x_    : Param;      // parameters to compute the X value
    private y_    : Param;      // parameters to compute the Y value
    private delay_: number;     // delay factor


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
            y: this.y_.init + this.y_.amp * Math.sin(this.y_.freq1 * Math.PI * this.y_.freq2 * t)
        };
    }
}

// animation class
export class Smoke extends IAnimation {

    //----- members
    private background_: Surface;
    private bgx0: number = 0;       // background X start position
    private bgy0: number = 0;       // background Y start position

    private particules_: Array<Particule>;
    private trails_: Array<Trail>;

    //----- methods
    // constructor
    constructor(display: Display) {
        super('smoke', display);

        // set the vars
        this.background_ = new Surface();
        this.particules_ = new Array(4);
        this.trails_     = new Array(3);
    }

    private setupParticules(): void {
        let cx = this.bgx0 + 137;
        let cy = this.bgy0 + 235;

        let x: Param = {init: cx, amp: 0, freq1: 0, freq2: 0};
        let y: Param = {init: cy, amp: 0, freq1: 0, freq2: 0};
        this.particules_[0] = new Particule(x, y, 0);

        x = {init: cx - 5, amp: 5, freq1: 2.25, freq2: 1.0};
        y = {init: 10 , amp: 7, freq1: 5.00, freq2: 1.0};
        this.particules_[1] = new Particule(x, y, -3.00);

        x = {init: cx - 7, amp: 2.5, freq1: 3.75, freq2: 1.0};
        y = {init: 22 , amp: 5.0, freq1: 2.50, freq2: 1.0};
        this.particules_[2] = new Particule(x, y, -3.14);

        x = {init: cx - 10, amp: 3.5, freq1: 4.75, freq2: 1.0};
        y = {init: 17 , amp: 9.0, freq1: 7.00, freq2: 1.0};
        this.particules_[3] = new Particule(x, y, -1.50);

        // create the trails between these particules
        this.trails_[0] = {src: this.particules_[0], dst: this.particules_[1], points: 500};
        this.trails_[1] = {src: this.particules_[0], dst: this.particules_[2], points: 500};
        this.trails_[2] = {src: this.particules_[0], dst: this.particules_[3], points: 500};
    }

    // draw the trails between points
    private drawTrails(t: number): void {
        for (let i = 0; i < this.trails_.length; i++) {
            const src = this.trails_[i].src;
            const dst = this.trails_[i].dst;
            const npt = this.trails_[i].points;

            // gray color gradient
            const gray = 0xe0;
            let delta = (0x30 - gray) / npt;
            let color: RGBA = new RGBA(gray, gray, gray);

            for (let j = 0; j < npt; j++) {
                let tt = j / npt;

                // compute the new position of each point
                let a = src.position(t - src.delay * tt);
                let b = dst.position(t - dst.delay * (1 - tt));

                // create the LERP for these
                let x = lerp(a.x, b.x, tt);
                let y = lerp(a.y, b.y, tt);

                // compute the color at this position
                let v = Math.floor(gray + (j * delta));
                color.red   = v;
                color.green = v;
                color.blue  = v;

                // draw the point
                this.display_.surface.setPixel(Math.floor(x), Math.floor(y), color);
            }
        }
    }

    // update the animation
    protected update(time?: number): void {
        if (!this.isAnimated) {
            return;
        }

        // copy the background on the display surface
        this.display_.surface.clear();
        this.display_.surface.blend({x: this.bgx0, y: this.bgy0}, this.background_);

        // draw the smoke trails
        let t = this.frames_ / 200;
        this.drawTrails(t);
    }

    // render the animation on the screen
    protected render(time?: number): void {
        if (!this.isAnimated)
            return;

        // flip the back-buffer onto the screen
        this.display_.draw();

        // increment the number of frames
        this.frames_++;
    }

    // setup function
    public setup(): void {
        this.background_
            .loadImage('/images/assets/ts-smoke.background.png')
            .then(result => {

                // set the background position
                this.bgx0 = this.display_.width - this.background_.width;
                this.bgy0 = 0;

                // setup the particules
                this.setupParticules();

                // toggle the animation
                this.toggle();

                // set the click handler to pause the animation
                window.onclick = () => {
                    this.toggle();
                }

                console.log("Starting Smoke animation.");
        });
    }

    // cleanup function
    public cleanup(): void {
    }

    // run the animation
    public run(time: number|undefined): States {

        // update & render the effect
        this.update(time);
        this.render(time);

        // this animation will run indefinitely
        return States.S_RUNNING;
    }
}