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

}