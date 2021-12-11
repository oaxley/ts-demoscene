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
                Math.floor(-1 + Math.random() * 2),
                Math.floor(-1 + Math.random() * 2)
            );

            this.particules_.push({p: p, inc: v});
        }
    }

    // update the animation
    protected update(time?: number): void {
        if (!this.isAnimated) {
            return;
        }
    }

    // render the animation on the screen
    protected render(time?: number): void {
        if (!this.isAnimated) {
            return;
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