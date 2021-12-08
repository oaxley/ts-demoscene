/*
 * @file    glenz.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Glenz effect in Typescript
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { States } from "library/core/manager";
import { Display } from "library/core/display";
import { radians } from "library/maths/utils";
import { Point2D, Point3D } from "library/core/interfaces";


//----- globals


//----- class
export class Glenz extends IAnimation {

    //----- members
    private costable_: number[];        // pre-computed cosine table
    private sintable_: number[];        // pre-computed sine table

    private plane3D_: Point3D[];        // the 3D plane
    private plane2D_: Point2D[];        // the 3D plane projection on the 2D space

    private angle_: number;             // rotation angle

    //----- methods
    // constructor
    constructor(display: Display) {
        super('glenz', display);

        // set the vars
        this.angle_ = 0;

        // initialize the plane
        this.plane3D_ = [
            { x: 100, y:-100, z: 100 },
            { x:-100, y:-100, z: 100 },
            { x:-100, y: 100, z: 100 },
            { x: 100, y: 100, z: 100 }
        ];
        this.plane2D_ = [
            { x: 0, y: 0},
            { x: 0, y: 0},
            { x: 0, y: 0},
            { x: 0, y: 0}
        ];


        // initialize the cos/sin tables
        this.costable_ = [];
        this.sintable_ = [];
        this.createTables();
    }

    // precompute cos/sin tables
    private createTables(): void {
        for (let i = 0; i < 360; i++) {
            let angle = radians(i);
            this.costable_[i] = Math.cos(angle);
            this.sintable_[i] = Math.sin(angle);
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
        // toggle the animation
        this.toggle();

        // set the click handler to pause the animation
        window.onclick = () => {
            this.toggle();
        }

        console.log("Starting Glenz animation.");
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