/*
 * @file    polygon.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Flat "glass" convex polygon filler: one colour blended over the destination
 *
 *          Each pixel inside the polygon becomes dst + (color - dst) * alpha, per R, G, B channel,
 *          with alpha in 8-bit fixed point (0 .. 256); the alpha byte is forced to 0xff.
 *
 *          Fill rule (top-left, the same as texture.ts): rows ceil(ymin) .. ceil(ymax) - 1, pixels
 *          ceil(xl) .. ceil(xr) - 1, so polygons sharing an edge never overlap nor leave holes:
 *          a tiled area is blended exactly once, with no seam.
 */

//----- imports
import { Point2D } from "library/core/interfaces";

//----- class
// an edge of a polygon chain, walked from top to bottom
class Edge {
    next: number = 0; // index of the bottom vertex of the edge
    yEnd: number = 0; // first row below the edge (ceil of the bottom vertex y)
    y0: number = 0; // top vertex y
    x0: number = 0; // top vertex x
    dx: number = 0; // x derivative along y

    // set the edge from vertex a to vertex b
    set(poly: Point2D[], a: number, b: number): void {
        const pa = poly[a];
        const pb = poly[b];
        this.next = b;
        this.yEnd = Math.ceil(pb.y);
        this.y0 = pa.y;
        this.x0 = pa.x;

        // horizontal edge: never used for a row
        const dy = pb.y - pa.y;
        this.dx = dy > 0 ? (pb.x - pa.x) / dy : 0;
    }
}

// the two chains of the polygon (preallocated, reused for every polygon)
const chainA = new Edge();
const chainB = new Edge();

//----- functions

/* fill a convex polygon with a colour blended over the destination
 *
 * Args:
 *      dst    : destination pixels (ABGR), width x height
 *      width  : destination width
 *      height : destination height
 *      poly   : convex polygon (3+ vertices, any winding)
 *      color  : glass colour (ABGR, its alpha byte is ignored)
 *      alpha  : opacity of the glass, in [0, 1] (clamped)
 */
export function fillGlassPolygon(
    dst: Uint32Array,
    width: number,
    height: number,
    poly: Point2D[],
    color: number,
    alpha: number,
): void {
    const n = poly.length;
    if (n < 3) return;

    // opacity in 8-bit fixed point: fully transparent glass changes nothing
    const a = Math.round(Math.min(Math.max(alpha, 0), 1) * 256);
    if (a === 0) return;

    // top and bottom vertices
    let top = 0;
    let bottom = 0;
    for (let i = 1; i < n; i++) {
        if (poly[i].y < poly[top].y) top = i;
        if (poly[i].y > poly[bottom].y) bottom = i;
    }

    // rows to draw, clipped to the buffer
    const yStart = Math.max(Math.ceil(poly[top].y), 0);
    const yEnd = Math.min(Math.ceil(poly[bottom].y), height);
    if (!(yStart < yEnd)) return;

    // colour channels
    const cr = color & 0xff;
    const cg = (color >> 8) & 0xff;
    const cb = (color >> 16) & 0xff;

    // the two chains from the top vertex: one walking the vertex list forward, the other backward
    chainA.set(poly, top, (top + 1) % n);
    chainB.set(poly, top, (top + n - 1) % n);

    for (let y = yStart; y < yEnd; y++) {
        // move to the edges covering this row
        while (chainA.yEnd <= y && chainA.next !== bottom) chainA.set(poly, chainA.next, (chainA.next + 1) % n);
        while (chainB.yEnd <= y && chainB.next !== bottom) chainB.set(poly, chainB.next, (chainB.next + n - 1) % n);

        // left / right edges
        let xl = chainA.x0 + (y - chainA.y0) * chainA.dx;
        let xr = chainB.x0 + (y - chainB.y0) * chainB.dx;
        if (xl > xr) {
            const t = xl;
            xl = xr;
            xr = t;
        }

        // pixels to draw, clipped to the buffer
        const xs = Math.max(Math.ceil(xl), 0);
        const xe = Math.min(Math.ceil(xr), width);

        // blend the span
        const row = y * width;
        for (let p = row + xs; p < row + xe; p++) {
            const d = dst[p];
            const r = d & 0xff;
            const g = (d >> 8) & 0xff;
            const b = (d >> 16) & 0xff;
            dst[p] =
                0xff000000 |
                ((b + (((cb - b) * a) >> 8)) << 16) |
                ((g + (((cg - g) * a) >> 8)) << 8) |
                (r + (((cr - r) * a) >> 8));
        }
    }
}
