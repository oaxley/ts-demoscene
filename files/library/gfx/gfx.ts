/*
 * @file    gfx.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Graphics drawing primitives
 */

//----- imports
import { Color } from "library/color/color";
import { COLOR_MODEL } from "library/color/basecolor";
import { Point2D } from "library/core/interfaces";

//----- interfaces

//----- functions
export namespace GFX {

    // set a pixel in the image data
    export function setPixel(imgdata: ImageData, p: Point2D, c: Color): void {
        let rgba = c.color.values;
        let addr = (p.y * imgdata.width + p.x) << 2;

        imgdata.data[addr + 0] = rgba.x;
        imgdata.data[addr + 1] = rgba.y;
        imgdata.data[addr + 2] = rgba.z;
        imgdata.data[addr + 3] = rgba.a;
    }

    // retrieve a pixel from the image data
    export function getPixel(imgdata: ImageData, p: Point2D): Color {
        let addr = (p.y * imgdata.width + p.x) << 2;

        let r = imgdata.data[addr + 0];
        let g = imgdata.data[addr + 1];
        let b = imgdata.data[addr + 2];
        let a = imgdata.data[addr + 3];

        return new Color(COLOR_MODEL.RGBA, r, b, g, a);
    }

    // draw a line with the Bresenham algorithm
    export function line(imgdata: ImageData, p1: Point2D, p2: Point2D, c: Color): void {
        let incrx: number, incry: number, x: number, y: number;
        let delta: number, dx: number, dy: number;

        [ incrx, incry, x, y ] = [ 1, 1, p1.x, p1.y];
        setPixel(imgdata, {x: x, y: y}, c);

        if ( p1.x > p2.x )
            incrx = -1;
        if ( p1.y > p2.y )
            incry = -1;

        dx = Math.abs(p1.x - p2.x);
        dy = Math.abs(p1.y - p2.y);

        if ( dx > dy ) {
            delta = dx / 2;
            for (let i = 1; i <= dx; i++) {
                x += incrx;
                delta += dy;
                if ( delta >= dx ) {
                    delta -= dx;
                    y += incry;
                }
                setPixel(imgdata, {x: x, y: y}, c);
            }
        }
        else {
            delta = dy / 2;
            for (let i = 1; i <= dy; i++) {
                y += incry;
                delta += dx;
                if ( delta >= dy ) {
                    delta -= dy;
                    x += incrx;
                }
                setPixel(imgdata, {x: x, y: y}, c);
            }
        }
    }

    // optimized algorithm for horizontal line
    export function hline(imgdata: ImageData, p1: Point2D, p2: Point2D, c: Color): void {
        let rgba = c.color.values;
        let x1 = p1.x;
        let x2 = p2.x;

        // check the begin / end of the line
        if (p1.x > p2.x) {
            x1 = p2.x;
            x2 = p1.x;
        }

        let addr = (p1.y * imgdata.width + x1) << 2;
        for (let i = x1; i <= x2; i++) {
            imgdata.data[addr + 0] = rgba.x;
            imgdata.data[addr + 1] = rgba.y;
            imgdata.data[addr + 2] = rgba.z;
            imgdata.data[addr + 3] = rgba.a;

            addr += 4;
        }
    }

    // optimized algorithm for vertical line
    export function vline(imgdata: ImageData, p1: Point2D, p2: Point2D, c: Color): void {
        let rgba = c.color.values;
        let y1 = p1.y;
        let y2 = p2.y;

        // check for begin / end of the line
        if (y1 > y2) {
            y1 = p2.y;
            y2 = p1.y;
        }

        let addr = (y1 * imgdata.width + p1.x) << 2;
        for (let i= y1; i <= y2; i++) {
            imgdata.data[addr + 0] = rgba.x;
            imgdata.data[addr + 1] = rgba.y;
            imgdata.data[addr + 2] = rgba.z;
            imgdata.data[addr + 3] = rgba.a;

            addr += imgdata.width;
        }
    }
}