/*
 * @file    sprites.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Sprites effect in Typescript
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { States } from "library/core/manager";
import { Display } from "library/core/display";
import { Surface } from "library/gfx/surface";
import { Point2D } from "library/core/interfaces";
import { Vector2D } from "library/maths/vector2d";
import { RGBA } from "library/color/RGBA";


//----- globals
const NUM_PARTICULES = 100;


//----- interfaces
interface Particule {
    p: Point2D;
    inc: Vector2D;
}

//----- class
export class Sprites extends IAnimation {

    //----- members
    private sprite_: Surface;
    private particules_: Particule[];       // particule elements


    //----- methods
    // constructor
    constructor(display: Display) {
        super('sprites', display);

        // set the vars
        this.sprite_ = new Surface();

        // create the particules
        this.particules_ = [];
        this.createParticules();
    }

    private createParticules(): void {
        for (let i = 0; i < NUM_PARTICULES; i++) {

            // find a random point
            let p: Point2D = {
                x: Math.floor(Math.random() * this.display_.width),
                y: Math.floor(Math.random() * this.display_.height)
            };

            // increment is between -1 and 1
            let v: Vector2D = new Vector2D(
                -1 + Math.random() * 2,
                -1 + Math.random() * 2
            );

            this.particules_.push({p: p, inc: v});
        }
    }

    // update the animation
    protected update(time?: number): void {
        if (!this.isAnimated) {
            return;
        }

        // update the particules
        for (let i = 0; i < this.particules_.length; i++) {
            // update the X value
            this.particules_[i].p.x += this.particules_[i].inc.x;
            if ((this.particules_[i].p.x > this.display_.width) || (this.particules_[i].p.x < 0)) {
                this.particules_[i].inc.x *= -1;
                this.particules_[i].p.x += this.particules_[i].inc.x;
            }

            // update the Y value
            this.particules_[i].p.y += this.particules_[i].inc.y;
            if ((this.particules_[i].p.y > this.display_.height) || (this.particules_[i].p.y < 0)) {
                this.particules_[i].inc.y *= -1;
                this.particules_[i].p.y += this.particules_[i].inc.y;
            }
        }
    }

    // render the animation on the screen
    protected render(time?: number): void {
        if (!this.isAnimated) {
            return;
        }

        let s = this.display_.surface;
        s.clear();

        let c = new RGBA(255, 255, 255);
        for (let i = 0; i < this.particules_.length; i++) {
            let x1 = Math.floor(this.particules_[i].p.x);
            let y1 = Math.floor(this.particules_[i].p.y);

            for (let j = 0; j < this.particules_.length; j++) {

                if (i == j) {
                    continue;
                }

                let x2 = Math.floor(this.particules_[j].p.x);
                let y2 = Math.floor(this.particules_[j].p.y);

                let xd = (x1 - x2);
                let yd = (y1 - y2);
                let d = Math.sqrt(xd * xd + yd * yd);

                if ( d < 50 ) {
                    s.line({x: x1, y: y1}, {x: x2, y: y2}, c);
                } else {
                    s.setPixel(x1  , y1  , c);
                    s.setPixel(x1+1, y1  , c);
                    s.setPixel(x1  , y1+1, c);
                    s.setPixel(x1+1, y1+1, c);
                }
            }
        }

        // flip the back-buffer onto the screen
        this.display_.draw();

        // increment the number of frames
        this.frames_++;
    }

    // setup function
    public setup(): void {
        // load the sprite
        this.sprite_
            .loadImage('/inages/assets/ts-sprite.asset.png')
            .then(result => {

                // toggle the animation
                this.toggle();

                // set the click handler to pause the animation
                window.onclick = () => {
                    this.toggle();
                }

                console.log("Starting Sprites animation.");
            });
    }

    // cleanup function
    public cleanup(): void {
    }

    // run the animation
    public run(time: number|undefined): States {

        // update & render the flames buffer
        this.update(time);
        this.render(time);

        // this animation will run indefinitely
        return States.S_RUNNING;
    }
}