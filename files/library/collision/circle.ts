/*
 * @file    circle.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Collision object: Circle
 */

//----- imports
import { Vector2D } from "library/maths/vector2d";
import { Rect } from "library/core/interfaces";
import { CollisionObject } from "./objects";


//----- class
export class CollisionCircle extends CollisionObject {

    //----- members
    private radius_  : number;          // circle radius
    private diameter_: number;          // circle diameter
    private mass_    : number;          // physical mass of the object


    //----- methods
    constructor(center: Vector2D, velocity: Vector2D, radius: number, mass: number) {
        super(center, velocity);

        // set the vars
        this.radius_   = radius;
        this.diameter_ = radius * 2;
        this.mass_     = mass;
    }

    // accessor to get the radius
    public get radius(): number {
        return this.radius_;
    }

    // accessor the get the mass
    public get mass(): number {
        return this.mass_;
    }

    // return the bounding box of the object
    public rect(center?: Vector2D): Rect {
        // check if we need to move the center
        let origin = this.center_;

        if (center !== undefined)
            origin = center;

        return {
            x: origin.x - this.radius_,
            y: origin.y - this.radius_,
            w: this.diameter_,
            h: this.diameter_
        };
    }

    // update the object
    public update(): void {
    }

    // render the object (to showcase simulation)
    public render(ctx: CanvasRenderingContext2D): void {
    }
}