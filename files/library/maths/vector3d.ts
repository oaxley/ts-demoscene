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

    // compute the magnitude of this vector
    public mag(): number {
        return Math.sqrt((this.x * this.x) + (this.y * this.y) + (this.z * this.z));
    }

    // compute the magnitude squared of this vector
    public mag2(): number {
        return (this.x * this.x) + (this.y * this.y) + (this.z * this.z);
    }

    // compute the distance with another vector
    public dist(other: Vector3D): number {
        let dx = this.x - other.x;
        let dy = this.y - other.y;
        let dz = this.z - other.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    // compute the distance squared with another vector
    public dist2(other: Vector3D): number {
        let dx = this.x - other.x;
        let dy = this.y - other.y;
        let dz = this.z - other.z;
        return (dx * dx + dy * dy + dz * dz);
    }

    // vector normalization
    public norm(): Vector3D {
        var mag = this.mag();
        return new Vector3D(
            this.x / mag,
            this.y / mag,
            this.z / mag
        );
    }

    // dot product
    public dot(other: Vector3D): number {
        return (this.x * other.x + this.y * other.y + this.z * other.z);
    }

    // cross product
    public cross(other: Vector3D): Vector3D {
        return new Vector3D (
            this.y * other.z - this.y * other.z,
            this.z * other.x - this.z * other.x,
            this.x * other.y - this.x * other.y
        );
    }

    // angle between two vectors
    public angle(other: Vector3D): number {
        let dot = this.dot(other);
        let mag = Math.sqrt(this.mag2() * other.mag2());
        return Math.acos(dot / mag);
    }

    // rotation around X axis
    public rotateX(angle: number): Vector3D {
        return new Vector3D (
            this.x,
            this.y * Math.cos(angle) - this.z * Math.sin(angle),
            this.y * Math.sin(angle) + this.z * Math.cos(angle)
        )
    }

    // rotation around Y axis
    public rotateY(angle: number): Vector3D {
        return new Vector3D (
            this.x * Math.cos(angle) + this.z * Math.sin(angle),
            this.y,
            -this.x * Math.sin(angle) + this.z * Math.cos(angle)
        )
    }

    // rotation around Z axis
    public rotateZ(angle: number): Vector3D {
        return new Vector3D (
            this.x * Math.cos(angle) - this.y * Math.sin(angle),
            this.x * Math.sin(angle) + this.y * Math.cos(angle),
            this.z,
        )
    }
}