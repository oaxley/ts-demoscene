/*
 * @file    wall.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Collision object: Wall (without velocity)
 */

//----- imports
import { Vector2D } from "library/maths/vector2d";
import { Rect } from "library/core/interfaces";
import { CollisionObject } from "./objects";


//----- class
export class CollisionWall extends CollisionObject {

    //----- members
    private coord_: Rect;


    //----- methods
    constructor(r: Rect) {
        // compute the center of the wall
        let xc = r.x + (r.w >> 1);
        let yc = r.y + (r.h >> 1);

        // call the base constructor
        super(new Vector2D(xc, yc), new Vector2D(0, 0));

        // set the vars
        this.coord_ = r;
    }

    // return the bounding box of the object
    public rect(center?: Vector2D): Rect {
        return this.coord_;
    }

    // update the object
    public update(): void {
        // nothing to do as the wall does not move
    }

    // render the object (to showcase simulation)
    public render(ctx: CanvasRenderingContext2D): void {
        // use canvas drawing routines for that
        ctx.beginPath();
        ctx.rect(this.coord_.x, this.coord_.y, this.coord_.w, this.coord_.h);
        ctx.strokeStyle = 'green';
        ctx.stroke();
    }
}
