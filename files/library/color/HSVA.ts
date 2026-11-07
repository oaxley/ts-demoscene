/*
 * @file    HSVA.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   HSVA color class
 */

//----- imports
import { BaseColor, Components, COLOR_MODEL } from "./basecolor";

//----- class
export class HSVA extends BaseColor {
    //----- methods

    constructor(h: number = 0, s: number = 0, l: number = 0, alpha: number = 1.0) {
        super(COLOR_MODEL.HSVA, h, s, l, alpha);
    }

    public static from(color: BaseColor): HSVA | undefined {
        if (color.model == COLOR_MODEL.HSVA) {
            return this.fromHSVA(color.values);
        } else if (color.model == COLOR_MODEL.HSLA) {
            return this.fromHSLA(color.values);
        } else if (color.model == COLOR_MODEL.RGBA) {
            return this.fromRGBA(color.values);
        }
    }

    public luminance(): number {
        return this.z_ * (1 - this.y_ / 2.0);
    }

    public dump(): void {
        console.log(`HSVA: H = ${this.x_}, S = ${this.y_}, V = ${this.z_}, A = ${this.a_}`);
    }

    public css(): string {
        throw Error("Method not implemented for HSVA color.");
    }

    public hex(): string {
        throw Error("Method not implemented for HSVA color.");
    }

    private static fromHSVA(hsva: Components): HSVA {
        return new HSVA(hsva.x, hsva.y, hsva.z, hsva.a);
    }

    private static fromHSLA(hsla: Components): HSVA {
        const [h, l] = [hsla.x, hsla.z];
        let s = hsla.y;
        let x: number;

        if (l < 0.5) {
            x = s * l;
        } else {
            x = s * (1 - l);
        }

        const v = l + x;
        s = (2 * x) / v;

        // encode the object - keep 3 decimals for precision
        return new HSVA(Math.floor(h), this.clamp(s), this.clamp(v), hsla.a);
    }

    private static fromRGBA(rgba: Components): HSVA {
        let h: number, s: number;

        const [r, g, b] = [rgba.x / 255.0, rgba.y / 255.0, rgba.z / 255.0];

        const min = Math.min(r, g, b);
        const max = Math.max(r, g, b);
        const delta = max - min;

        // hue
        if (delta - this.EPSILON < 0) {
            h = 0; // no hue if no saturation
        } else {
            if (max - r < this.EPSILON) {
                h = (g - b) / delta;
            } else {
                if (max - g < this.EPSILON) {
                    h = 2.0 + (b - r) / delta;
                } else {
                    h = 4.0 + (r - g) / delta;
                }
            }

            h = h * 60;
            while (h < 0) {
                h = h + 360;
            }
        }

        // saturation
        if (max - this.EPSILON < 0) {
            s = 0;
        } else {
            s = delta / max;
        }

        // value
        const v = max;

        // encode the object - keep 3 decimals for precision
        return new HSVA(Math.floor(h), this.clamp(s), this.clamp(v), this.clamp(rgba.a / 255.0));
    }
}
