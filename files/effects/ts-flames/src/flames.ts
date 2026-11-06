/*
 * @file    flames.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Flames effect in Typescript
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { States } from "library/core/manager";

import { Display } from "library/core/display";
import { Palette } from "library/color/palette";
import { Color } from "library/color/color";
import { RGBA } from "library/color/RGBA";
import { Point2D, Point3D } from "library/core/interfaces";
import { bresenham } from "library/gfx/bresenham";
import { TrigTables, projectSameAngle } from "library/maths/projection";


//----- globals
const WHITE_COLOR_INDEX = 255;
const BLACK_COLOR_INDEX = 0;
const WHITE_PERCENTAGE = 0.55;

const ZOOM = 256;


//----- class
export class Flames extends IAnimation {

    //----- members
    private palette_: Palette;
    private flames_ : number[];

    private tables_: TrigTables;            // precomputed cosinus/sinus tables

    private cube3D_: Point3D[];             // the initial cube in 3D
    private cube2D_: Point2D[];             // the cube after projecting on screen
    private angle_: number;                 // current cube angle for all axis
    private depth_: number;                 // screen depth
    private center_: Point2D;               // cube center
    private offset_: Point2D;               // offset to move the cube center


    //----- methods
    // constructor
    constructor(display: Display) {
        super('flames', display);

        // set the vars
        this.palette_ = new Palette();
        this.flames_  = [];

        // create the palette
        this.createPalette();

        // initialize flames buffer
        for (let i = 0; i < this.width_ * this.height_; i++) {
            this.flames_[i] = BLACK_COLOR_INDEX;
        }

        // create the cos/sin precompute tables
        this.tables_ = new TrigTables();

        // initialize the 3D cube
        this.cube3D_ = [
            { x:-100, y:-100, z:-100 },
            { x: 100, y:-100, z:-100 },
            { x: 100, y: 100, z:-100 },
            { x:-100, y: 100, z:-100 },
            { x: 100, y:-100, z: 100 },
            { x:-100, y:-100, z: 100 },
            { x:-100, y: 100, z: 100 },
            { x: 100, y: 100, z: 100 }
        ]

        // create the initial values in the array
        this.cube2D_ = []
        for (let i = 0; i < 8; i++) {
            this.cube2D_.push({ x: 0, y: 0});
        }

        // default value for the cube
        this.angle_ = 0;
        this.depth_ = 384;
        this.center_ = { x: 320, y: 200};
        this.offset_ = { x: 2, y: 1};
    }

    // create the Fire palette
    private createPalette(): void {

        for (let i = 0; i < 32; i++) {
            // black to blue
            this.palette_.setColor(i, Color.from(new RGBA(0, 0, i << 1)));

            // blue to red
            this.palette_.setColor(i + 32, Color.from(new RGBA(i << 3, 0, 64 - (i << 1))));

            // red to yellow
            this.palette_.setColor(i + 64, Color.from(new RGBA(255, i << 3, 0)));

            // yellow to white
            this.palette_.setColor(i + 96, Color.from(new RGBA(255, 255, i << 2)));
            this.palette_.setColor(i + 128, Color.from(new RGBA(255, 255, 64 + (i << 2))));
            this.palette_.setColor(i + 160, Color.from(new RGBA(255, 255, 128 + (i << 2))));
            this.palette_.setColor(i + 192, Color.from(new RGBA(255, 255, 192 + i )));
            this.palette_.setColor(i + 224, Color.from(new RGBA(255, 255, 224 + i )));
        }
    }

    // generate the flames at the bottom
    private generate(): void {
        if ( !this.isAnimated ) {
            return;
        }

        for (let y = this.height_ - 2; y < this.height_; y++) {
            let offset = y * this.width_;
            for (let x = 0; x < this.width_; x+=2) {
                let color = BLACK_COLOR_INDEX;

                if ( Math.random() > WHITE_PERCENTAGE ) {
                    color = WHITE_COLOR_INDEX;
                }

                this.flames_[offset + x] = color;
                this.flames_[offset + (x+1)] = color;
            }
        }
    }


    // set a white pixel in the flame buffer
    private setPixel(x: number, y: number): void {
        if ( (x > this.width_ - 2) || (x < 2) || (y > this.height_) || (y < 0) )
            return;

        this.flames_[(y * this.width_) + x] = WHITE_COLOR_INDEX;
    }

    // compute the 2D projection of the 3D object
    private projection(angle: number, center: Point2D): void {
        projectSameAngle(this.cube3D_, this.cube2D_, this.tables_.cos[angle], this.tables_.sin[angle],
                         center, this.depth_, ZOOM);
    }

    // trace a line in the flame buffer with the Bresenham algorithm
    private line(p1: Point2D, p2: Point2D): void {
        bresenham(p1, p2, (x, y) => this.setPixel(x, y));
    }

    // draw the cube
    private drawCube(): void {
        this.line(this.cube2D_[0], this.cube2D_[1]);
        this.line(this.cube2D_[1], this.cube2D_[2]);
        this.line(this.cube2D_[2], this.cube2D_[3]);
        this.line(this.cube2D_[3], this.cube2D_[0]);

        this.line(this.cube2D_[4], this.cube2D_[5]);
        this.line(this.cube2D_[5], this.cube2D_[6]);
        this.line(this.cube2D_[6], this.cube2D_[7]);
        this.line(this.cube2D_[7], this.cube2D_[4]);

        this.line(this.cube2D_[0], this.cube2D_[5]);
        this.line(this.cube2D_[1], this.cube2D_[4]);
        this.line(this.cube2D_[2], this.cube2D_[7]);
        this.line(this.cube2D_[3], this.cube2D_[6]);
    }

    // update the animation
    protected update(time?: number): void {
        if (!this.isAnimated)
            return;

        // move the center of the cube
        this.center_.x += this.offset_.x;
        this.center_.y += this.offset_.y;

        if ((this.center_.x < (this.width_ * 0.20)) || (this.center_.x > (this.width_ * 0.80))) {
            this.offset_.x *= -1;
        }

        if ((this.center_.y < (this.height_ * 0.20)) || (this.center_.y > (this.height_ * 0.70))) {
            this.offset_.y *= -1;
        }

        // compute the projection of the cube
        this.projection(this.angle_, this.center_);

        // we draw the cube only every 3 frames to allow time for "burning"
        if( (this.frames_ % 3) == 0 ) {
            this.drawCube();
        }

        // increment angle value
        this.angle_ += 2;
        if ( this.angle_ > 360 )
            this.angle_ = 0;

        // create the flame effect
        for (let y = 1; y < this.height_ - 1; y++) {
            let offset = y * this.width_;
            for (let x = 1; x < this.width_ - 1; x++) {
                let value = 0;
                value += this.flames_[offset - this.width_ + x];
                value += this.flames_[offset + x - 1];
                value += this.flames_[offset + x + 1];
                value += this.flames_[offset + this.width_ + x];

                // artificially reduce the flames
                value = value - 3;
                value = (value < 0) ? 0 : value;

                // store the new value above the current pixel
                this.flames_[offset - this.width_ + x] = value >> 2;
            }
        }
    }

    // render the animation on the screen
    protected render(time?: number): void {
        if (!this.isAnimated)
            return;

        // copy the flames
        for (let y = 0; y < this.height_; y++) {
            let offset = y * this.width_;
            for (let x = 0; x < this.width_; x++) {

                // retrieve rgba components
                let index = this.flames_[offset + x];
                let rgba  = <RGBA> this.palette_.getColor(index)!.color;

                // set the corresponding pixel in the buffer
                this.display_.surface.setPixel(x, y, rgba);
            }
        }

        // flip the back-buffer onto the screen
        this.display_.draw();

        // increment the number of frames
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

        console.log("Starting Flames animation.");
    }

    // cleanup function
    public cleanup(): void {
    }

    // run the animation
    public run(time: number|undefined): States {

        // fuel the flames at the bottom
        this.generate();

        // update & render the flames buffer
        this.update(time);
        this.render(time);

        // this animation will run indefinitely
        return States.S_RUNNING;
    }
}