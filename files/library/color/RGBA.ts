/*
 * @file    RGBA.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   RGBA color class
 */

//----- imports
import { BaseColor, Components, COLOR_MODEL } from "./basecolor"


//---- class
export class RGBA extends BaseColor {

    //----- methods

    constructor(r: number = 0, g: number = 0, b: number = 0, alpha: number = 255) {
        super(COLOR_MODEL.RGBA, r, g, b, alpha);
    }

    public static from(color: BaseColor): RGBA {
        if ( color.model == COLOR_MODEL.RGBA ) {
            return this.fromRGBA(color.values);
        }
    }

    public dump(): void {
        console.log(`RGBA: R = ${this.x_}, G = ${this.y_}, B = ${this.z_}, A = ${this.a_}`);
    }

    public css(): string {
        return `rgba(${this.x_}, ${this.y_}, ${this.z_}, ${this.a_})`;
    }

    public hex(): string {
        function _hexConversion(value:number):string {
            let str = value.toString(16);
            str = (str.length < 2) ? '0' + str : str;
            return str;
        }

        let r = _hexConversion(this.x_);
        let g = _hexConversion(this.y_);
        let b = _hexConversion(this.z_);

        return `#${r}${g}${b}`;
    }

    private static fromRGBA(rgba: Components): RGBA {
        return new RGBA(rgba.x, rgba.y, rgba.z, rgba.a);
    }

    private static fromHSLA(hsla: Components): RGBA {
        let h: number, s: number, l: number, a: number;
        let t1: number, t2: number;
        let tr: number, tg: number, tb: number;

        // function to compute HSL values
        function _computeValues(x:number):number {
            let y: number = 0.0;

            if ( (6 * x) < 1.0 ) {
                y = t2 + ((t1 - t2) * 6 * x);
            }
            else {
                if ( (2 * x) < 1.0 ) {
                    y = t1;
                }
                else {
                    if ( (3 * x) < 2.0 ) {
                        y = t2 + ((t1 - t2) * (0.666 - x) * 6);
                    }
                    else {
                        y = t2;
                    }
                }
            }

            return y;
        };

        // setup local values for easy readiness
        [ h, s, l, a ]= [ hsla.x, hsla.y, hsla.z, hsla.a ];


        // no saturation, just use the luminance
        if ( s == 0 ) {
            l = Math.round(255 * l)
            return new RGBA(l, l, l, Math.round(a*255));
        }

        // compute the temporay values
        t1 = ( l < 0.5 ) ? (l * (1.0 + s)) : ((l + s) - (l * s));
        t2 = (2 * l) - t1;

        // convert hue to [0..1]
        h = h / 360.0;

        // temporary R,G,B
        tr = ((h + 0.333) > 1.0) ? (h + 0.333 - 1.0) : (h + 0.333);
        tg = h;
        tb = ((h - 0.333) < 0.0) ? (h - 0.333 + 1.0) : (h - 0.333);

        // set RGB values
        return new RGBA(
                Math.round(255 * _computeValues(tr)),
                Math.round(255 * _computeValues(tg)),
                Math.round(255 * _computeValues(tb)),
                Math.round(a * 255)
        );
    }

    private static fromHSVA(hsva: Components): RGBA {
        let r:number, g:number, b:number
        let h:number, s:number, v:number
        let c:number, x:number, m:number

        [ h, s, v ] = [ hsva.x, hsva.y, hsva.z ];

        // temporary values
        c = v * s;
        m = v - c;
        x = c * (1 - Math.abs( ((h/60) % 2) - 1 ) );

        // map each color from its position on the circle
        if( (h >= 0) && (h < 60) ) {
            [ r, g, b ] = [ c, x, 0 ]
        } else if( (h >= 60) && (h < 120) ) {
            [ r, g, b ] = [ x, c, 0 ]
        } else if( (h >= 120) && (h < 180) ) {
            [ r, g, b ] = [ 0, c, x ]
        } else if( (h >= 180) && (h < 240) ) {
            [ r, g, b ] = [ 0, x, c ]
        } else if( (h >= 240) && (h < 300) ) {
            [ r, g, b ] = [ x, 0, c ]
        } else if( (h >= 300) && (h < 360) ) {
            [ r, g, b ] = [ c, 0, x ]
        } else {
            [ r, g, b ] = [0, 0, 0]
        }

        return new RGBA(
                Math.round((r + m) * 255),
                Math.round((g + m) * 255),
                Math.round((b + m) * 255),
                Math.round(hsva.a * 255)
        );
    }
}