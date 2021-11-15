/*
 * @file    gfx.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Graphics drawing primitives
 */

//----- imports
import { Color } from "library/color/color";
import { Point2D } from "library/core/interfaces";

//----- interfaces

//----- functions
namespace GFX {

    // set a pixel in the image data
    export function setPixel(imgdata: ImageData, p: Point2D, c: Color): void {
        let rgba = c.color.values;
        let addr = (p.y * imgdata.width + p.x) << 2;

        imgdata.data[addr + 0] = rgba.x;
        imgdata.data[addr + 1] = rgba.y;
        imgdata.data[addr + 2] = rgba.z;
        imgdata.data[addr + 3] = rgba.a;
    }
}