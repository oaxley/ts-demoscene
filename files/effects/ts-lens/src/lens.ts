/*
 * @file    lens.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Lens effect
 */

//----- imports
import { Animation } from "library/core/animation";
import { Display } from "library/core/display";
import { Vector2D } from "library/maths/vector2d";

import { CollisionDetector } from "library/collision/detector";
import { CollisionWall } from "library/collision/wall";
import { CollisionCircle } from "library/collision/circle";

import { LensAnimation } from "./lens_anim";


//----- globals
export const RADIUS_TO_MASS = 0.1;              // radius to mass ratio
export const RADIUS = 40;                       // default lens radius
export const LENS_MAGNIFICATION = 20;           // lens magnification
export const WALL_SIZE = 3;                     // wall size


//----- interfaces
interface LensObject {
    circle: CollisionCircle,
    lens: LensAnimation
}


//----- class
export class Lens extends Animation {

    //----- members
    private display_: Display;
    private image_: HTMLImageElement;

    //----- methods
    constructor(display: Display) {
        super();

        // set the vars
        this.display_ = display;

        // load the background image
        this.image_ = new Image();
        this.image_.src = '/images/ts-lens.background.jpg';
    }

    // run the animation
    public run(): void {
        console.log("Starting the Lens animation.");

        // toggle the animation
        this.toggle();

        // run the animation on the next frame
        requestAnimationFrame(this.main.bind(this));
    }

    // update the animation
    protected update(timestamp: number): void {
        if (!this.isAnimated)
            return;
    }

    // render the animation on screen
    protected render(timestamp: number): void {
        if (!this.isAnimated)
            return;

        // load the background image in the back-buffer
        this.display_.loadImage(this.image_);

        // flip the back-buffer onto the screen
        this.display_.draw();

        // increase frames count
        this.frames_++;
    }

    // main animation function
    protected main(timestamp: number): void {
        this.update(timestamp);
        this.render(timestamp);
        requestAnimationFrame(this.main.bind(this));
    }
}