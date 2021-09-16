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
        // compute the broader & narrow collision detection
        let collisions = this.broaderCollision();
        this.narrowCollision(collisions);

        // update the objects after collisions
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

    // compute the narrow collision detection
    private narrowCollision(collisions: CollisionResult[]): void {
        // no previous collisions found
        if (collisions.length == 0)
            return;

        // go through all the collisions
        for (let i = 0; i < collisions.length; i++) {
            // objects involved in the collision
            let left  = this.objects_[collisions[i].left];
            let right = this.objects_[collisions[i].right];

            // wall collision
            if ( (left instanceof CollisionCircle) && (right instanceof CollisionWall) ) {
                let x = left.center.x;
                let y = left.center.y;
                let box = right.rect();

                // change the velocity of the circle depending on where it hits the wall
                if ( (x < box.x) || (x > (box.x + box.w)) )
                    left.velocity = new Vector2D(-left.velocity.x, left.velocity.y);

                if ( (y < box.y) || (y > (box.y + box.h)) )
                    left.velocity = new Vector2D(left.velocity.x, -left.velocity.y);
            }

            // circle / circle collision
            if ( (left instanceof CollisionCircle) && (right instanceof CollisionCircle) ) {
                // check if the collision is already done for this pair
                if ( left.hasCollided && right.hasCollided )
                    continue;

                // ensure it's a true collision (and not bouding box just overlapping)
                let xc1 = left.center.x;
                let yc1 = left.center.y;
                let rc1 = left.radius;

                let xc2 = right.center.x;
                let yc2 = right.center.y;
                let rc2 = right.radius;

                // compute the squared distance between the two circles
                let dist = (xc2 - xc1) * (xc2 - xc1) + (yc2 - yc1) * (yc2 - yc1);
                let r2 = (rc1 + rc2) * (rc1 + rc2);

                if (dist < r2) {
                    // collision vector normalized
                    let norm = (new Vector2D(xc2 - xc1, yc2 - yc1)).norm();

                    // p-value resulting from the collision
                    let p = 2 * ( (left.velocity.x  * norm.x)
                                + (left.velocity.y  * norm.y)
                                - (right.velocity.x * norm.x)
                                - (right.velocity.y * norm.y) ) / (left.mass + right.mass);

                    // compute the new left velocity after energy transfer
                    left.velocity.x = left.velocity.x - p * left.mass * norm.x;
                    left.velocity.x = left.velocity.y - p * left.mass * norm.y;

                    // compute the new right velocity after energy transfer
                    right.velocity.x = right.velocity.x - p * right.mass * norm.x;
                    right.velocity.x = right.velocity.y - p * right.mass * norm.y;

                    // set the collision markers
                    left.hasCollided  = true;
                    right.hasCollided = true;
                }
            }
        }
    }
}
