/*
 * @file    cube.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Rotating texture-mapped cube in Typescript
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { Display } from "library/core/display";
import { Point2D, Point3D } from "library/core/interfaces";

import { verticalGradient } from "library/color/gradient";

import { Surface } from "library/gfx/surface";
import { TEXTURE_SIZE, TexVertex, drawTexturedPolygon } from "library/gfx/texture";
import { TrigTables, rotate, perspective } from "library/maths/projection";

//----- globals
export const CUBE_SIZE = 75; // half edge length

export const ZOOM = 600; // projection: x * ZOOM / (z + DEPTH)
export const DEPTH = 500; // cube centre distance to the camera (> CUBE_SIZE * sqrt(3))
export const PATH_X = 110; // cube centre wandering range (camera space, keeps the cube on screen)
export const PATH_Y = 52;
const PATH_SPEED = 0.008; // wandering speed (radians per frame)
const STEP_X = 1; // rotation steps per frame (degrees, distinct per axis)
const STEP_Y = 2;
const STEP_Z = 3;
const SKY_TOP: [number, number, number] = [0, 16, 96]; // background gradient: dark blue at the top ...
const SKY_BOTTOM: [number, number, number] = [0, 0, 0]; // ... black at the bottom

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
 * of the image (clockwise on screen with y down), matching FACE_UV.
 */
export const FACES: number[][] = [
    [0, 1, 2, 3], // front  (z = -S)
    [5, 4, 7, 6], // back   (z = +S)
    [4, 0, 3, 7], // left   (x = -S)
    [1, 5, 6, 2], // right  (x = +S)
    [4, 5, 1, 0], // top    (y = -S)
    [3, 2, 6, 7], // bottom (y = +S)
];

// texture coordinates of each face vertex (texture is 256x256)
export const FACE_UV: Point2D[] = [
    { x: 0, y: 0 },
    { x: 256, y: 0 },
    { x: 256, y: 256 },
    { x: 0, y: 256 },
];

// unit vector toward the light: top-left-front, normalised (-1, -1, -2)
const LIGHT: Point3D = { x: -1 / Math.sqrt(6), y: -1 / Math.sqrt(6), z: -2 / Math.sqrt(6) };
const AMBIENT = 0.4; // minimum face brightness
const DIFFUSE = 0.6; // brightness added by the light

//----- functions
// back-face culling: a face is visible when its first 3 projected vertices turn clockwise (y down)
export function isVisible(a: Point2D, b: Point2D, c: Point2D): boolean {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) > 0;
}

// flat shading of a face: AMBIENT + DIFFUSE * max(0, n.L), n = unit outward normal
export function faceShade(p: Point3D[], face: number[]): number {
    const a = p[face[0]];
    const b = p[face[1]];
    const d = p[face[3]];

    // (right x down) points inward: the outward normal is (down x right)
    const rx = b.x - a.x;
    const ry = b.y - a.y;
    const rz = b.z - a.z;
    const dx = d.x - a.x;
    const dy = d.y - a.y;
    const dz = d.z - a.z;
    const nx = dy * rz - dz * ry;
    const ny = dz * rx - dx * rz;
    const nz = dx * ry - dy * rx;

    const dot = (nx * LIGHT.x + ny * LIGHT.y + nz * LIGHT.z) / Math.hypot(nx, ny, nz);
    return Math.min(1, AMBIENT + DIFFUSE * Math.max(0, dot));
}

// cube centre for a frame: two sines of unrelated frequencies per axis,
// smooth (no jump, never stops) and never repeating exactly
export function cubePath(frame: number): Point2D {
    const t = frame * PATH_SPEED;
    return {
        x: PATH_X * (0.6 * Math.sin(1.0 * t) + 0.4 * Math.sin(2.31 * t + 1.7)),
        y: PATH_Y * (0.6 * Math.sin(1.37 * t + 0.5) + 0.4 * Math.sin(2.83 * t + 2.9)),
    };
}

//----- class
export class Cube extends IAnimation {
    //----- members
    private tables_: TrigTables; // pre-computed cosine/sine tables
    private texture_: Surface; // face image
    private background_: Uint32Array; // vertical gradient

    private rotated_: Point3D[]; // rotated vertices (centred on the cube)
    private projected_: Point2D[]; // projected vertices (screen)
    private poly_: TexVertex[]; // face polygon given to the filler

    private ax_: number; // rotation angles (degrees)
    private ay_: number;
    private az_: number;

    //----- methods
    constructor(display: Display) {
        super("cube", display);

        // set the vars
        this.tables_ = new TrigTables();
        this.texture_ = new Surface();
        this.background_ = verticalGradient(this.width_, this.height_, SKY_TOP, SKY_BOTTOM);

        this.rotated_ = VERTICES.map(() => ({ x: 0, y: 0, z: 0 }));
        this.projected_ = VERTICES.map(() => ({ x: 0, y: 0 }));
        this.poly_ = FACE_UV.map(() => ({ x: 0, y: 0, z: 0, u: 0, v: 0 }));

        this.ax_ = 0;
        this.ay_ = 0;
        this.az_ = 0;
    }

    // load the face image, which must be TEXTURE_SIZE x TEXTURE_SIZE
    protected init(): Promise<unknown> {
        return this.texture_.loadImage("/images/assets/ts-cube.texture.png").then(() => {
            const { width, height } = this.texture_;
            if (width !== TEXTURE_SIZE || height !== TEXTURE_SIZE) {
                throw new Error(`Texture is ${width}x${height}, expected ${TEXTURE_SIZE}x${TEXTURE_SIZE}.`);
            }
        });
    }

    // update the animation: rotate and project the cube
    protected update(): void {
        const { cos, sin } = this.tables_;
        const ax = this.ax_;
        const ay = this.ay_;
        const az = this.az_;
        rotate(VERTICES, cos[ax], sin[ax], cos[ay], sin[ay], cos[az], sin[az], this.rotated_);

        // move the cube in camera space (real 3D: its side shows when off-centre)
        const offset = cubePath(this.frames_);
        const cx = this.width_ >> 1;
        const cy = this.height_ >> 1;
        for (let i = 0; i < this.rotated_.length; i++) {
            const p = this.rotated_[i];
            perspective(p.x + offset.x, p.y + offset.y, p.z, ZOOM, DEPTH, cx, cy, this.projected_[i]);
        }

        // next angles
        this.ax_ = (ax + STEP_X) % 360;
        this.ay_ = (ay + STEP_Y) % 360;
        this.az_ = (az + STEP_Z) % 360;
    }

    // render the animation on screen
    protected render(): void {
        const dst = this.display_.surface.data32;
        dst.set(this.background_);

        // texture not loaded yet: background only
        if (this.texture_.width === TEXTURE_SIZE && this.texture_.height === TEXTURE_SIZE) {
            const texture = this.texture_.data32;
            const p2 = this.projected_;
            const p3 = this.rotated_;
            const poly = this.poly_;

            // opaque convex solid: the visible faces never overlap
            for (const face of FACES) {
                if (!isVisible(p2[face[0]], p2[face[1]], p2[face[2]])) {
                    continue;
                }

                for (let i = 0; i < 4; i++) {
                    const v = poly[i];
                    v.x = p2[face[i]].x;
                    v.y = p2[face[i]].y;
                    v.z = p3[face[i]].z + DEPTH;
                    v.u = FACE_UV[i].x;
                    v.v = FACE_UV[i].y;
                }
                drawTexturedPolygon(dst, this.width_, this.height_, poly, texture, faceShade(p3, face));
            }
        }

        // flip the back-buffer onto the screen
        this.display_.draw();
    }
}
