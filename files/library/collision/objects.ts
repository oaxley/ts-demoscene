/*
 * @file    object.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Abstract class to define an object for the Collision detector
 */

//----- imports
import { Vector2D } from "library/maths/vector2d";
import { Rect } from "library/core/interfaces";


//----- class
export abstract class CollisionObject {

    //----- members
    protected center_  : Vector2D;          // the object center
    protected velocity_: Vector2D;          // the object velocity
    private collided_  : boolean;           // =true if the object has a collision


    //----- methods
    constructor(center: Vector2D, velocity: Vector2D) {
        // set the vars
        this.center_   = center;
        this.velocity_ = velocity;
        this.collided_ = false;
    }

    // accessor to get collision information
    public get hasCollided(): boolean {
        return this.collided_;
    }

    // accessor to set the collision information
    public set hasCollided(value: boolean) {
        this.collided_ = value;
    }

    // accessor to get the object center
    public get center(): Vector2D {
        return this.center_;
    }

    // accessor to get the object velocity
    public get velocity(): Vector2D {
        return this.velocity_;
    }

    // accessor to set the object velocity
    public set velocity(value: Vector2D) {
        this.velocity_ = value;
    }

    // return the bounding box of the object
    public abstract rect(center?: Vector2D): Rect;

    // update the object
    public abstract update(): void;

    // render the object (to showcase simulation)
    public abstract render(ctx: CanvasRenderingContext2D): void;
}