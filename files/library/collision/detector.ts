/*
 * @file    detector.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Collision detector
 */

//----- imports
import { Vector2D } from "library/maths/vector2d";
import { Rect } from "library/core/interfaces";

import { CollisionObject } from "./objects";
import { CollisionWall } from "./wall";
import { CollisionCircle } from "./circle";


//----- class
export class CollisionDetector {

    //----- members
    private objects_: CollisionObject[];


    //----- methods
    constructor(objects?: CollisionObject[]) {
        if (objects === undefined)
            this.objects_ = [];
        else
            this.objects_ = objects;
    }

    // add a new object to the collision detector
    public add(object: CollisionObject): void {
        this.objects_.push(object);
    }

    // update the collision detection for all objects
    public update(): void {
        this.objects_.forEach(element => {
            element.update();
        });

    }

    // render the collision detection boxes of all objects
    public render(ctx: CanvasRenderingContext2D): void {
        this.objects_.forEach(element => {
            element.render(ctx);
        });
    }

}
