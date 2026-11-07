/*
 * @file    bresenham.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Bresenham line algorithm
 */

//----- imports
import { Point2D } from "library/core/interfaces";

//----- functions

/* walk through all the points of a line (Bresenham algorithm)
 *
 * Args:
 *      p1  : first point of the line
 *      p2  : last point of the line
 *      plot: function called for each point (from p1 to p2, both included)
 */
export function bresenham(p1: Point2D, p2: Point2D, plot: (x: number, y: number) => void): void {
    let incrx = 1;
    let incry = 1;
    let x = p1.x;
    let y = p1.y;

    plot(x, y);

    if (p1.x > p2.x) incrx = -1;
    if (p1.y > p2.y) incry = -1;

    const dx = Math.abs(p1.x - p2.x);
    const dy = Math.abs(p1.y - p2.y);

    let delta: number;
    if (dx > dy) {
        delta = dx / 2;
        for (let i = 1; i <= dx; i++) {
            x += incrx;
            delta += dy;
            if (delta >= dx) {
                delta -= dx;
                y += incry;
            }
            plot(x, y);
        }
    } else {
        delta = dy / 2;
        for (let i = 1; i <= dy; i++) {
            y += incry;
            delta += dx;
            if (delta >= dy) {
                delta -= dy;
                x += incrx;
            }
            plot(x, y);
        }
    }
}
