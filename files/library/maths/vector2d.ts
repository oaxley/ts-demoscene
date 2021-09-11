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

    // create a string out of our vector information
    public toString(): string {
        return `(${this.x}, ${this.y})`;
    }

    // create an array out of our vector information
    public array(): Array<number> {
        return [this.x, this.y];
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

    // compute the magnitude of this vector
    public mag(): number {
        return Math.sqrt((this.x * this.x) + (this.y * this.y));
    }

    // compute the magnitude square of this vector
    public mag2(): number {
        return (this.x * this.x) + (this.y * this.y);
    }

    // normalize the vector
    public norm(): Vector2D {
        var mag = this.mag();
        return new Vector2D(
            this.x / mag,
            this.y / mag
        );
    }

    // compute the distance with another vector
    public dist(other: Vector2D): number {
        let dx = this.x - other.x;
        let dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // compute the distance squared with another vector
    public dist2(other: Vector2D): number {
        let dx = this.x - other.x;
        let dy = this.y - other.y;
        return (dx * dx + dy * dy);
    }

    // compute the dot product with another vector
    public dot(other: Vector2D): number {
        return (this.x * other.x + this.y * other.y);
    }

}