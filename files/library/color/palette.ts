/*
 * @file    palette.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Color palette management
 */

//----- imports
import { Color } from "./color";

//----- class
export class Palette {
    //----- members
    private colors_: Color[];

    //----- methods
    constructor() {
        this.colors_ = [ ];
    }

    public dump(): void {
        for(var i = 0; i < this.colors_.length; i++) {
            console.log(`${i} : ` + this.colors_[i].color.css());
        }
    }

    public get count(): number {
        return this.colors_.length;
    }

    public set push(c: Color) {
        this.colors_.push(c);
    }

    public getColor(i: number): Color|undefined {
        if ( i > this.colors_.length ) {
            return undefined;
        }
        else {
            return this.colors_[i];
        }
    }

    public setColor(i: number, c: Color): void {
        this.colors_[i] = c;
    }
}