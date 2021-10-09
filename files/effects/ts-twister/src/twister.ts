/*
 * @file    twister.ts
 * @author  Sebastien LEGRAND
 * 
 * @brief   Twister effect
 */

//----- imports
import { Animation } from "library/core/animation";
import { Display } from "library/core/display";
import { radians } from "library/maths/utils";


//----- globals
const BAR_WIDTH = 200;


//----- class
export class Twister extends Animation {
 
    //----- members
    private display_: Display;
    
    private angle_    : number;     // rotation angle
    private amplitude_: number;     // movement amplitude
    private ampway_   : number;     // movement way


    //----- methods
    constructor(display: Display) {
        super();

        // set the vars
        this.display_ = display;
        this.angle_ = 0;
        this.amplitude_ = 0;
        this.ampway_ = 0.05;
    }

    // run the animation
    public run(): void {
        console.log("Starting the Twister animation.");

        // toggle the animation
        this.toggle();

        // run the animation on the next frame
        requestAnimationFrame(this.main.bind(this));
    }

    // update the animation
    protected update(timestamp: number): void {
        if (!this.isAnimated)
            return;
        
        // setup vars
        let x0 = this.display_.width >> 1;
        let w  = BAR_WIDTH >> 1;

        // erase the surface
        this.display_.surface.clear();
        let ctx = this.display_.surface.context;

        for (let y = 0; y < this.display_.height; y++) {
            let fv = 1.0 * y / this.display_.height;
            
            // compute the position of each point
            let a = radians(90);
            let x1 = x0 + (w * Math.sin(this.amplitude_ * fv + this.angle_ + a * 0));
            let x2 = x0 + (w * Math.sin(this.amplitude_ * fv + this.angle_ + a * 1));
            let x3 = x0 + (w * Math.sin(this.amplitude_ * fv + this.angle_ + a * 2));
            let x4 = x0 + (w * Math.sin(this.amplitude_ * fv + this.angle_ + a * 3));

            // draw the lines
            if (x1 < x2) {
                ctx.beginPath();
                ctx.strokeStyle = 'rgb(128,0,0)';
                ctx.moveTo(x1, y);
                ctx.lineTo(x2, y);
                // ctx.closePath();
                ctx.stroke();
            }

            if (x2 < x3) {
                ctx.beginPath();
                ctx.strokeStyle = 'rgb(0,128,0)';
                ctx.moveTo(x2, y);
                ctx.lineTo(x3, y);
                // ctx.closePath();
                ctx.stroke();
            }

            if (x3 < x4) {
                ctx.beginPath();
                ctx.strokeStyle = 'rgb(0,0,128)';
                ctx.moveTo(x3, y);
                ctx.lineTo(x4, y);
                // ctx.closePath();
                ctx.stroke();
            }

            if (x4 < x1) {
                ctx.beginPath();
                ctx.strokeStyle = 'rgb(64,64,64)';
                ctx.moveTo(x4, y);
                ctx.lineTo(x1, y);
                // ctx.closePath();
                ctx.stroke();
            }            
        }

    }

    // render the animation on the screen
    protected render(timestamp: number): void {
        if (!this.isAnimated)
            return;

        // update the angle
        this.angle_ += 0.035;

        // update the amplitude every 50 frames
        if (this.frames_ % 50 == 0) {
            this.amplitude_ += this.ampway_;
            if ((this.amplitude_ <= 0) || (this.amplitude_ > 1.8))
                this.ampway_ *= -1;
        }
            
        // flip the back-buffer onto the screen
        this.display_.clear();
        this.display_.draw();

        // increase the frames count
        this.frames_++;
    }

    // main animation function
    protected main(timestamp: number): void {
        this.update(timestamp);
        this.render(timestamp);
        requestAnimationFrame(this.main.bind(this));
    }
}