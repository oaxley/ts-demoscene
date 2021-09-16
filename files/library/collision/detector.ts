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


//----- interfaces
interface CollisionResult {
    left: number,                   // left object involved in the collision
    right: number                   // right object involved in the collision
}


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

    // compute the broader collision detection (based on bounding rectangle boxes)
    private broaderCollision(): CollisionResult[] {
        let collisions: CollisionResult[] = [];

        // got through all the objects
        for (let i = 0; i < this.objects_.length; i++) {

            // only moving objects will be checked against wall
            if (this.objects_[i] instanceof CollisionWall)
                continue;

            // compute the bounding box of this object after simulating its next move
            let center: Vector2D = this.objects_[i].center.add(this.objects_[i].velocity);
            let left = this.objects_[i].rect(center);

            // check this object against all the other objects in the scene
            for (let j = 0; j < this.objects_.length; j++) {
                // no collision detection between ourself
                if (i == j)
                    continue;

                // find the object (right) we might collide with
                let right: Rect = null;
                if (this.objects_[j] instanceof CollisionWall) {
                    // wall don't move
                    right = this.objects_[j].rect();
                } else {
                    // compute the next move for this object
                    center = this.objects_[j].center.add(this.objects_[j].velocity);
                    right  = this.objects_[j].rect(center);
                }

                // check for rectangle collision
                if ( (left.x < right.x + right.w) && (left.x + left.w > right.x)  &&
                     (left.y < right.y + right.h) && (left.y + left.h > right.y) ) {
                    collisions.push({left: i, right: j});
                }
            }
        }

        return collisions;
    }
}
