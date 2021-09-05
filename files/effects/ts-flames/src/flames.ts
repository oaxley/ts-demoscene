/*
 * @file    flames.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Flames effect in Typescript
 */

//----- imports
import { Animation } from "library/core/animation";
import { Display } from "library/core/display";
import { Palette } from "library/color/palette";
import { Color } from "library/color/color";
import { RGBA } from "library/color/RGBA";


//----- globals
const WHITE_COLOR_INDEX = 255;
const BLACK_COLOR_INDEX = 0;
const WHITE_PERCENTAGE = 0.55;


//----- class
export class Flames extends Animation {

    //----- members
    private display_: Display;
    private palette_: Palette;
    private flames_ : number[];
    private width_  : number;
    private height_ : number;


    //----- methods
    // constructor
    constructor(display: Display) {
        super();

        // set the vars
        this.display_ = display;
        this.width_   = display.width;
        this.height_  = display.height;
        this.flames_  = [];

        // create the palette
        this.createPalette();

        // initialize flames buffer
        for (let i = 0; i < this.width_ * this.height_; i++) {
            this.flames_[i] = BLACK_COLOR_INDEX;
        }
    }

    // create the Fire palette
    private createPalette(): void {
        this.palette_ = new Palette();

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

    // run the animation
    public run(): void{
        console.log("Starting Flames animation.");

        // toggle the animation
        this.toggle();

        // generate the data
        this.generate();

        // run the animation on the next frame
        requestAnimationFrame(this.main.bind(this));
    }

    // update the animation
    protected update(timestamp: number): void{
        if (!this.isAnimated)
            return;
    }

    // render the animation on the screen
    protected render(timestamp: number): void{
        if (!this.isAnimated)
            return;

        // retrieve the backbuffer image data
        let img_data = this.display_.surface.data;

        // copy the flames
        for (let y = 0; y < this.height_; y++) {
            let offset = y * this.width_;
            for (let x = 0; x < this.width_; x++) {

                // retrieve rgba components
                let index = this.flames_[offset + x];
                let rgba  = this.palette_.getColor(index).color.values;

                // set the corresponding pixel in the buffer
                let position = (offset + x)  << 2;
                img_data.data[position + 0] = rgba.x;
                img_data.data[position + 1] = rgba.y;
                img_data.data[position + 2] = rgba.z;
                img_data.data[position + 3] = rgba.a;
            }
        }

        // put back the image data on the backbuffer
        this.display_.surface.data = img_data;

        // flip the back-buffer onto the screen
        this.display_.draw();
    }

    // animation main function
    protected main(timestamp: number): void{
        this.update(timestamp);
        this.render(timestamp);

        requestAnimationFrame(this.main.bind(this));
    }
}