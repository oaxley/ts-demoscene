/*
 * @file    glenz.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Glenz vector in Typescript: a spinning cube made of checkered glass
 *
 *          Each face is a 4x4 checker of blue and white glass cells, blended over the picture.
 *          The back faces (seen from inside, through the cube) are drawn first, then the front
 *          faces on top: where they overlap, the picture is seen through two layers of glass.
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { Display } from "library/core/display";
import { Point2D, Point3D } from "library/core/interfaces";

import { RGBA } from "library/color/RGBA";

import { Surface } from "library/gfx/surface";
import { fillGlassPolygon } from "library/gfx/polygon";
import { rotate, perspective } from "library/maths/projection";

//----- globals
export const CUBE_SIZE = 90; // half edge length

export const ZOOM = 600; // projection: x * ZOOM / (z + DEPTH)
export const DEPTH = 500; // cube centre distance to the camera (> CUBE_SIZE * sqrt(3))
export const GRID = 4; // cells per face edge

export const BLUE = RGBA.toUInt32(0x00, 0x80, 0xc0); // checker colours
export const WHITE = RGBA.toUInt32(255, 255, 255);
export const FRONT_ALPHA = 0.45; // opacity of the front faces glass
export const BACK_ALPHA = 0.3; // opacity of the back faces glass

const DEG = Math.PI / 180;
const STEP_X = 0.5 * DEG; // rotation steps per frame (radians, distinct per axis)
const STEP_Y = 1.0 * DEG;
const STEP_Z = 1.5 * DEG;
const DRIFT_X = 60; // cube centre drift (camera space, x / y only)
const DRIFT_Y = 30;
const DRIFT_SPEED = 0.01; // drift speed (radians per frame)

/* 8 corners (camera space: x right, y down, z away from the camera)
 *
 *      front (z = -S)      back (z = +S)
 *       0 ---- 1            4 ---- 5
 *       |      |            |      |
 *       3 ---- 2            7 ---- 6
 */
export const VERTICES: Point3D[] = [
    { x: -CUBE_SIZE, y: -CUBE_SIZE, z: -CUBE_SIZE },
    { x: CUBE_SIZE, y: -CUBE_SIZE, z: -CUBE_SIZE },
    { x: CUBE_SIZE, y: CUBE_SIZE, z: -CUBE_SIZE },
    { x: -CUBE_SIZE, y: CUBE_SIZE, z: -CUBE_SIZE },
    { x: -CUBE_SIZE, y: -CUBE_SIZE, z: CUBE_SIZE },
    { x: CUBE_SIZE, y: -CUBE_SIZE, z: CUBE_SIZE },
    { x: CUBE_SIZE, y: CUBE_SIZE, z: CUBE_SIZE },
    { x: -CUBE_SIZE, y: CUBE_SIZE, z: CUBE_SIZE },
];

/* 6 faces, opposite pairs are (0,1), (2,3), (4,5)
 *
 * Seen from outside, the vertices are: top-left, top-right, bottom-right, bottom-left
 * (clockwise on screen with y down when the face looks at the camera).
 */
export const FACES: number[][] = [
    [0, 1, 2, 3], // front  (z = -S)
    [5, 4, 7, 6], // back   (z = +S)
    [4, 0, 3, 7], // left   (x = -S)
    [1, 5, 6, 2], // right  (x = +S)
    [4, 5, 1, 0], // top    (y = -S)
    [3, 2, 6, 7], // bottom (y = +S)
];

const N = GRID + 1; // grid points per face edge

//----- functions
// a face looks at the camera when its first 3 projected vertices turn clockwise (y down);
// edge-on (cross = 0) counts as back, so each face is in exactly one group
export function isFront(a: Point2D, b: Point2D, c: Point2D): boolean {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) > 0;
}

// checker colour of the cell (i, j) of a face
export function cellColor(i: number, j: number): number {
    return (i + j) & 1 ? WHITE : BLUE;
}

// P + (Q - P) * i / GRID, written so that it is exact at both ends and symmetric:
// lerpG(P, Q, i) === lerpG(Q, P, GRID - i) bitwise (no seam between faces sharing an edge)
function lerpG(p: number, q: number, i: number): number {
    return (p * (GRID - i) + q * i) / GRID;
}

/* grid of (GRID + 1)^2 points of a face, index j * (GRID + 1) + i
 *
 * Args:
 *      p    : cube corners
 *      face : face corner indices (top-left, top-right, bottom-right, bottom-left)
 *      out  : grid points (written in place)
 */
export function faceGrid(p: Point3D[], face: number[], out: Point3D[]): void {
    const a = p[face[0]];
    const b = p[face[1]];
    const c = p[face[2]];
    const d = p[face[3]];

    for (let i = 0; i < N; i++) {
        // top (A -> B) and bottom (D -> C) points of the column
        const tx = lerpG(a.x, b.x, i);
        const ty = lerpG(a.y, b.y, i);
        const tz = lerpG(a.z, b.z, i);
        const bx = lerpG(d.x, c.x, i);
        const by = lerpG(d.y, c.y, i);
        const bz = lerpG(d.z, c.z, i);

        for (let j = 0; j < N; j++) {
            const o = out[j * N + i];
            o.x = lerpG(tx, bx, j);
            o.y = lerpG(ty, by, j);
            o.z = lerpG(tz, bz, j);
        }
    }
}

//----- class
export class Glenz extends IAnimation {
    //----- members
    private background_: Surface; // background image

    private rotated_: Point3D[]; // rotated and drifted corners (camera space)
    private projected_: Point2D[]; // projected corners (screen)
    private grid3_: Point3D[]; // grid of the face being drawn (camera space)
    private grid2_: Point2D[]; // ... projected (screen)
    private cell_: Point2D[]; // cell polygon given to the filler

    private ax_: number; // rotation angles (radians)
    private ay_: number;
    private az_: number;

    //----- methods
    constructor(display: Display) {
        super("glenz", display);

        // set the vars
        this.background_ = new Surface();

        this.rotated_ = VERTICES.map(() => ({ x: 0, y: 0, z: 0 }));
        this.projected_ = VERTICES.map(() => ({ x: 0, y: 0 }));
        this.grid3_ = Array.from({ length: N * N }, () => ({ x: 0, y: 0, z: 0 }));
        this.grid2_ = Array.from({ length: N * N }, () => ({ x: 0, y: 0 }));
        this.cell_ = Array.from({ length: 4 }, () => ({ x: 0, y: 0 }));

        this.ax_ = 0;
        this.ay_ = 0;
        this.az_ = 0;
    }

    // load the assets
    protected init(): Promise<unknown> {
        return this.background_.loadImage("/images/assets/ts-glenz.background.jpg");
    }

    // update the animation: rotate, drift and project the cube
    protected update(): void {
        const ax = this.ax_;
        const ay = this.ay_;
        const az = this.az_;
        rotate(
            VERTICES,
            Math.cos(ax),
            Math.sin(ax),
            Math.cos(ay),
            Math.sin(ay),
            Math.cos(az),
            Math.sin(az),
            this.rotated_,
        );

        // drift the cube centre in x / y (never z: the cube stays in front of the camera)
        const t = this.frames_ * DRIFT_SPEED;
        const ox = DRIFT_X * Math.sin(t);
        const oy = DRIFT_Y * Math.sin(t * 1.37 + 0.5);
        for (let i = 0; i < this.rotated_.length; i++) {
            const p = this.rotated_[i];
            p.x += ox;
            p.y += oy;
            this.project(p, this.projected_[i]);
        }

        // next angles
        this.ax_ = (ax + STEP_X) % (2 * Math.PI);
        this.ay_ = (ay + STEP_Y) % (2 * Math.PI);
        this.az_ = (az + STEP_Z) % (2 * Math.PI);
    }

    // perspective projection of a camera space point on the screen (corners and grid points alike)
    private project(p: Point3D, out: Point2D): void {
        perspective(p.x, p.y, p.z, ZOOM, DEPTH, this.width_ >> 1, this.height_ >> 1, out);
    }

    // draw the cells of a face as glass
    private drawFace(dst: Uint32Array, face: number[], alpha: number): void {
        const g3 = this.grid3_;
        const g2 = this.grid2_;
        const cell = this.cell_;

        // grid of the face, projected once
        faceGrid(this.rotated_, face, g3);
        for (let i = 0; i < g3.length; i++) {
            this.project(g3[i], g2[i]);
        }

        // cells (projected cells of a planar face stay convex)
        for (let j = 0; j < GRID; j++) {
            for (let i = 0; i < GRID; i++) {
                const p = j * N + i;
                cell[0] = g2[p];
                cell[1] = g2[p + 1];
                cell[2] = g2[p + N + 1];
                cell[3] = g2[p + N];
                fillGlassPolygon(dst, this.width_, this.height_, cell, cellColor(i, j), alpha);
            }
        }
    }

    // render the animation on screen
    protected render(): void {
        // background not loaded yet: nothing to draw
        const bg = this.background_;
        if (bg.width !== this.width_ || bg.height !== this.height_) {
            this.display_.draw();
            return;
        }

        const dst = this.display_.surface.data32;
        dst.set(bg.data32);

        // back faces first (seen through the cube), then the front faces over them
        const p2 = this.projected_;
        for (const face of FACES) {
            if (!isFront(p2[face[0]], p2[face[1]], p2[face[2]])) {
                this.drawFace(dst, face, BACK_ALPHA);
            }
        }
        for (const face of FACES) {
            if (isFront(p2[face[0]], p2[face[1]], p2[face[2]])) {
                this.drawFace(dst, face, FRONT_ALPHA);
            }
        }

        // flip the back-buffer onto the screen
        this.display_.draw();
    }
}
