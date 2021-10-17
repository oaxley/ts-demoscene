/*
 * @file    lens.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Lens effect
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { States } from "library/core/manager";

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
export class Lens extends IAnimation {

    //----- members
    private image_   : HTMLImageElement;
    private lenses_  : LensObject[];            // list of lenses in the animation
    private detector_: CollisionDetector;       // Collision detector instance


    //----- methods
    constructor(display: Display) {
        super('lens', display);

        // load the background image
        this.image_ = new Image();
        this.image_.src = '/images/ts-lens.background.jpg';

        // create an instance of the CollisionDetector and add objects to it
        this.detector_ = new CollisionDetector();
        this.createWalls();
        this.createLenses();

    }

    // create wall around the display zone to bounce the lenses
    private createWalls(): void {
        let dw = this.display_.width;
        let dh = this.display_.height;
        let tmp = dh - (WALL_SIZE * 2) - 2;

        // top wall
        this.detector_.add(
            new CollisionWall({x: 0, y: 0, w: dw, h: WALL_SIZE})
        );

        // left wall
        this.detector_.add(
            new CollisionWall({x: 0, y: WALL_SIZE + 1, w: WALL_SIZE, h: tmp})
        );

        // right wall
        this.detector_.add(
            new CollisionWall({x: dw - WALL_SIZE, y: WALL_SIZE + 1, w: WALL_SIZE, h: tmp})
        );

        // bottom wall
        this.detector_.add(
            new CollisionWall({x: 0, y: dh - WALL_SIZE, w: dw, h: WALL_SIZE})
        );
    }

    // create lenses
    private createLenses(): void {
        let weight = RADIUS * RADIUS_TO_MASS;
        let ctx = this.display_.surface.context;

        this.lenses_ = [];
        this.lenses_.push({
            circle: new CollisionCircle(new Vector2D(200, 2*RADIUS), this.randomVelocity(), RADIUS, weight),
            lens: new LensAnimation(ctx, RADIUS, LENS_MAGNIFICATION)
        });

        this.lenses_.push({
            circle: new CollisionCircle(new Vector2D(400, 4*RADIUS), this.randomVelocity(), 2*RADIUS, 2*weight),
            lens: new LensAnimation(ctx, 2*RADIUS, LENS_MAGNIFICATION)
        });

        this.lenses_.push({
            circle: new CollisionCircle(new Vector2D(400, 400), this.randomVelocity(), RADIUS, weight),
            lens: new LensAnimation(ctx, RADIUS, LENS_MAGNIFICATION)
        });

        // add the lenses to the collision detector
        this.lenses_.forEach(element => {
            this.detector_.add(element.circle);
        });
    }

    // generate a random velocity vector
    private randomVelocity(): Vector2D {
        let x = -5 + 10 * Math.random();
        let y = -5 + 10 * Math.random();

        return new Vector2D(x, y);
    }

     // update the animation
    protected update(timestamp: number): void {
        if (!this.isAnimated)
            return;

        // update the collision detector
        this.detector_.update();

    }

    // render the animation on screen
    protected render(timestamp: number): void {
        if (!this.isAnimated)
            return;

        // load the background image in the back-buffer
        this.display_.loadImage(this.image_);

        // compute the transformation for all the lenses
        this.lenses_.forEach(element => {
            // retrieve the center from the collision object
            let center = element.circle.center;

            // compute the transformation at this spot
            element.lens.compute(center.x, center.y);
        });

        // flip the back-buffer onto the screen
        this.display_.draw();

        // increase frames count
        this.frames_++;
    }

    // run the animation
    public run(time: number|undefined): States {
        console.log("Starting the Lens animation.");

        // update & render the animation
        this.update(time);
        this.render(time);

        // this animation will run indefinitely
        return States.S_RUNNING;
    }

    // setup function
    public setup(): void {
        // toggle the animation
        this.toggle();

        // set the click handler to pause the animation
        window.onclick = () => {
            this.toggle();
        }
    }

    // cleanup function
    public cleanup(): void {
    }
}