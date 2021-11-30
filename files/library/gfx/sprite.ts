/*
 * @file    sprite.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   A simple sprite
 */

//----- imports
import { Point2D, Rect, Size } from "library/core/interfaces";
import { Vector2D } from "library/maths/vector2d";
import { Surface } from "./surface";



//----- class
export class Sprite {

    //----- members
    private bitmap_: Surface;
    private width_: number;
    private height_: number;

    private position_: Point2D;
    private velocity_: Vector2D;


    //----- methods
    constructor() {

        // set the vars
        this.bitmap_ = new Surface();
        this.width_  = 0;
        this.height_ = 0;
        this.position_ = {x: 0, y: 0};
        this.velocity_ = new Vector2D();
    }

    //----- accessors
    public get size(): Size {
        return {width: this.width_, height: this.height_};
    }

    public get surface(): Surface {
        return this.bitmap_;
    }

    // get/set the position of the srite
    public get position(): Point2D {
        return this.position_;
    }
    public set position(p: Point2D) {
        this.position_ = p;
    }

    // get set the velocity
    public get velocity(): Vector2D {
        return this.velocity_;
    }
    public set velocity(v: Vector2D) {
        this.velocity_ = v;
    }

    //----- functions
    // draw the sprite on another surface a the specified position
    public draw(position: Point2D, other: Surface, opacity?: number, mask?: number): void {
        let size: Rect = {x: 0, y:0, w: this.width_, h: this.height_};
        other.blend(position, other, size, opacity, mask);
    }

}