/*
 * @file    vector3d.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   2D Vector class
 */

//----- class
export class Vector3D {

    //----- members
    public x: number;
    public y: number;
    public z: number;

    //----- methods

    // constructor
    constructor(x: number = 0, y: number = 0, z: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    // create a string out of our vector information
    public toString(): string {
        return `(${this.x}, ${this.y}, ${this.z})`;
    }

    // create an array out of our vector information
    public array(): Array<number> {
        return [this.x, this.y, this.z];
    }

    // add a vector to us
    public add(other: Vector3D): Vector3D {
        return new Vector3D(
            this.x + other.x,
            this.y + other.y,
            this.z + other.z
        );
    }

    // substract a vector from us
    public sub(other: Vector3D): Vector3D {
        return new Vector3D(
            this.x - other.x,
            this.y - other.y,
            this.z - other.z
        );
    }

    // multiply the vector by a number
    public mult(value: number|Vector3D): Vector3D {
        if (value instanceof Vector3D) {
            return new Vector3D(
                this.x * value.x,
                this.y * value.y,
                this.z * value.z
            );
        } else {
            return new Vector3D(
                this.x * value,
                this.y * value,
                this.z * value
            );
        }
    }

    // divide the vector by a number or another vector
    public div(value: number|Vector3D): Vector3D {
        if (value instanceof Vector3D) {
            return new Vector3D(
                this.x / value.x,
                this.y / value.y,
                this.z / value.z
            );
        } else {
            return new Vector3D(
                this.x / value,
                this.y / value,
                this.z / value
            );
        }
    }

}