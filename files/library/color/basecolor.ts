/*
 * @file    basecolor.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Base class for color management
 */

//----- globals

// constants for precision
const DIGITS = 3                    // number of digits for the precision
const PRECISION = 10 ** DIGITS

// available color models
export enum COLOR_MODEL {
    RGBA,
    HSLA,
    HSVA,
    UNKNOWN
}

//----- interfaces
export interface Components {
    m: COLOR_MODEL,
    x: number,
    y: number,
    z: number,
    a: number
}


//----- class
export abstract class BaseColor {

    //----- members
    private model_: COLOR_MODEL = COLOR_MODEL.UNKNOWN       // color model for this color
    protected x_: number = 0                                // first color component
    protected y_: number = 0                                // second color component
    protected z_: number = 0                                // third color component
    protected a_: number = 0                                // alpha value

    protected static EPSILON = 0.0001;                      // to compare float values

    //----- methods

    constructor(model: COLOR_MODEL = COLOR_MODEL.UNKNOWN,
                x: number = 0, y: number = 0, z: number = 0, a: number = 0) {
        [ this.model_, this.x_, this.y_, this.z_, this.a_ ] = [ model, x, y, z, a ];
    }

    //----- statics

    // clamp a value within the precision
    public static clamp(x: number): number {
        return Math.trunc(x * PRECISION) / PRECISION;
    }

    //----- accessors

    // return the values
    public get values(): Components {
        return {
            m: this.model_,
            x: this.x_,
            y: this.y_,
            z: this.z_,
            a: this.a_
        };
    }

    protected set values(color: Components) {
        [ this.model_, this.x_, this.y_, this.z_, this.a_ ] = [ color.m, color.x, color.y, color.z, color.a ];
    }

    // get the current color model
    public get model() {
        return this.model_;
    }

    // get/set the alpha value
    public get alpha(): number {
        return this.a_;
    }
    public set alpha(v: number) {
        this.a_ = v;
    }

    //----- functions

    // retrieve the luminance of a color
    public abstract luminance(): number;

    // dump the components in the console
    public abstract dump(): void;

    // output a CSS color
    public abstract css(): string;

    // output the hexadecimal value
    public abstract hex(): string;
}