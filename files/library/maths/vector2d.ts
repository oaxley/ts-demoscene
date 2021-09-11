/*
 * @file    vector2d.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   2D Vector class
 */

//----- class
export class Vector2D {

    //----- members
    public x: number;
    public y: number;

    //----- methods

    // constructor
    constructor(x: number = 0, y: number = 0) {
        this.x = x;
        this.y = y;
    }

    // add a vector to us
    public add(other: Vector2D): Vector2D {
        return new Vector2D(
            this.x + other.x,
            this.y + other.y
        );
    }

    // substract a vector from us
    public sub(other: Vector2D): Vector2D {
        return new Vector2D(
            this.x - other.x,
            this.y - other.y
        );
    }

    // multiply the vector by a number or another vector
    public mult(value: number|Vector2D): Vector2D {
        if (value instanceof Vector2D) {
            return new Vector2D(
                this.x * value.x,
                this.y * value.y
            );
        } else {
            return new Vector2D(
                this.x * value,
                this.y * value
            );
        }
    }

    // divide the vector by a number or another vector
    public div(value: number|Vector2D): Vector2D {
        if (value instanceof Vector2D) {
            return new Vector2D(
                this.x / value.x,
                this.y / value.y
            );
        } else {
            return new Vector2D(
                this.x / value,
                this.y / value
            );
        }
    }

}