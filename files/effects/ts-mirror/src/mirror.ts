/*
 * @file    mirror.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Torus Mirror: a chrome torus spinning above a checkered floor
 *
 *          Every frame:
 *            1. the sky and the scrolling checkered floor are drawn row by row (floor.ts);
 *            2. an environment map is built: a 256x256 picture of what is seen in every
 *               direction from the torus centre (floor below the horizon, sky above);
 *            3. the torus vertices and normals are rotated and moved, and for each vertex the
 *               view ray is reflected on the normal: the reflected direction gives the (u, v)
 *               of the vertex in the environment map (torus.ts);
 *            4. the torus quads are sorted back to front (it is not convex: it hides parts of
 *               itself) and drawn as textured triangles with the environment map.
 *
 *          The reflection depends on the view direction and the normal, so it slides over the
 *          surface when the torus turns and moves, like a real mirror.
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { Display } from "library/core/display";
import { Point2D, Point3D } from "library/core/interfaces";

import { TexVertex, drawTexturedPolygon } from "library/gfx/texture";
import { TrigTables, rotate, perspective } from "library/maths/projection";
import { isClockwise } from "library/maths/mesh";

import { torusMesh, reflect, sphereUV, TorusMesh } from "./torus";
import { drawFloor, buildEnvMap, ZOOM, HORIZON } from "./floor";
import { drawSky } from "./sky";

//----- globals
export const MAJOR_R = 60; // ring radius
export const MINOR_R = 24; // tube radius
const RING = 32; // segments around the ring
const TUBE = 16; // segments around the tube

export const CENTRE_Y = 83; // torus centre (camera space, y down, the floor is at FLOOR_Y)
export const CENTRE_Z = 500;
export const PATH_X = 120; // drift ranges: mostly left / right, a little up / down
export const PATH_Y = 15;
const PATH_SPEED = 0.008; // drift speed (radians per frame)

const STEP_X = 1; // rotation steps per frame (degrees, distinct per axis)
const STEP_Y = 2;
const STEP_Z = 3;
const SCROLL = 4; // floor scroll toward the viewer (units per frame)
const CLOUD_SCROLL = 2; // cloud scroll (slower than the floor: they are further away)
export const REFLECTANCE = 0.8; // the chrome reflects 80% of the light: its outline shows on the sky

const MESH: TorusMesh = torusMesh(MAJOR_R, MINOR_R, RING, TUBE);
const SKY_TEXEL = 0; // texel (0, 0) of the environment map is outside the disc: sky

//----- functions

// torus centre for a frame: two sines of unrelated frequencies per axis (as ts-cube)
export function torusPath(frame: number): Point3D {
    const t = frame * PATH_SPEED;
    return {
        x: PATH_X * (0.6 * Math.sin(1.0 * t) + 0.4 * Math.sin(2.31 * t + 1.7)),
        y: CENTRE_Y + PATH_Y * (0.6 * Math.sin(1.37 * t + 0.5) + 0.4 * Math.sin(2.83 * t + 2.9)),
        z: CENTRE_Z,
    };
}

// =true when the 4 reflected directions of a quad go up: it only sees the sky
export function isSkyQuad(r: Point3D[], quad: number[]): boolean {
    return r[quad[0]].y <= 0 && r[quad[1]].y <= 0 && r[quad[2]].y <= 0 && r[quad[3]].y <= 0;
}

//----- class
export class Mirror extends IAnimation {
    //----- members
    private tables_: TrigTables; // pre-computed cosine/sine tables
    private envMap_: Uint32Array; // environment map (256x256)

    private world_: Point3D[]; // rotated and moved vertices (camera space)
    private normals_: Point3D[]; // rotated normals
    private reflected_: Point3D[]; // reflected view directions
    private uv_: Point2D[]; // environment map coordinates
    private screen_: Point2D[]; // projected vertices
    private centre_: Point3D; // torus centre

    private order_: number[]; // quads sorted back to front
    private depth_: Float64Array; // mean depth of each quad
    private tri_: TexVertex[]; // triangle given to the filler

    private ax_: number; // rotation angles (degrees)
    private ay_: number;
    private az_: number;

    //----- methods
    constructor(display: Display) {
        super("mirror", display);

        // set the vars
        this.tables_ = new TrigTables();
        this.envMap_ = new Uint32Array(256 * 256);

        const n = MESH.vertices.length;
        const p3 = () => Array.from({ length: n }, () => ({ x: 0, y: 0, z: 0 }));
        const p2 = () => Array.from({ length: n }, () => ({ x: 0, y: 0 }));
        this.world_ = p3();
        this.normals_ = p3();
        this.reflected_ = p3();
        this.uv_ = p2();
        this.screen_ = p2();
        this.centre_ = torusPath(0);

        this.order_ = MESH.quads.map((_, i) => i);
        this.depth_ = new Float64Array(MESH.quads.length);
        this.tri_ = [0, 1, 2].map(() => ({ x: 0, y: 0, z: 0, u: 0, v: 0 }));

        this.ax_ = 0;
        this.ay_ = 0;
        this.az_ = 0;
    }

    // update the animation: rotate, move, project and reflect the torus
    protected update(): void {
        const { cos, sin } = this.tables_;
        const ax = this.ax_;
        const ay = this.ay_;
        const az = this.az_;
        const cx = cos[ax];
        const sx = sin[ax];
        const cy = cos[ay];
        const sy = sin[ay];
        const cz = cos[az];
        const sz = sin[az];
        rotate(MESH.vertices, cx, sx, cy, sy, cz, sz, this.world_);
        rotate(MESH.normals, cx, sx, cy, sy, cz, sz, this.normals_);

        const c = torusPath(this.frames_);
        this.centre_ = c;
        const half = this.width_ >> 1;
        const d: Point3D = { x: 0, y: 0, z: 0 };
        for (let i = 0; i < this.world_.length; i++) {
            const p = this.world_[i];
            p.x += c.x;
            p.y += c.y;
            p.z += c.z;
            perspective(p.x, p.y, p.z, ZOOM, 0, half, HORIZON, this.screen_[i]);

            // view ray from the camera (origin) to the vertex, reflected on the normal
            const k = 1 / Math.hypot(p.x, p.y, p.z);
            d.x = p.x * k;
            d.y = p.y * k;
            d.z = p.z * k;
            reflect(d, this.normals_[i], this.reflected_[i]);
            sphereUV(this.reflected_[i], this.uv_[i]);
        }

        // back to front
        const depth = this.depth_;
        const w = this.world_;
        MESH.quads.forEach((q, i) => {
            depth[i] = w[q[0]].z + w[q[1]].z + w[q[2]].z + w[q[3]].z;
        });
        this.order_.sort((a, b) => depth[b] - depth[a]);

        // next angles
        this.ax_ = (ax + STEP_X) % 360;
        this.ay_ = (ay + STEP_Y) % 360;
        this.az_ = (az + STEP_Z) % 360;
    }

    // render the animation on screen
    protected render(): void {
        const w = this.width_;
        const h = this.height_;
        const dst = this.display_.surface.data32;
        const scroll = this.frames_ * SCROLL;
        const map = this.envMap_;
        const c = this.centre_;

        drawSky(dst, w, h, this.frames_ * CLOUD_SCROLL);
        drawFloor(dst, w, h, scroll);
        buildEnvMap(map, c.x, c.y, c.z, scroll);

        const tri = this.tri_;
        const p2 = this.screen_;
        const p3 = this.world_;
        const uv = this.uv_;
        for (const qi of this.order_) {
            const q = MESH.quads[qi];
            const sky = isSkyQuad(this.reflected_, q);

            // two triangles: (0, 1, 2) and (0, 2, 3)
            for (let t = 1; t <= 2; t++) {
                const a = q[0];
                const b = q[t];
                const e = q[t + 1];
                if (!isClockwise(p2[a], p2[b], p2[e])) {
                    continue;
                }
                const ids = [a, b, e];
                for (let k = 0; k < 3; k++) {
                    const i = ids[k];
                    const v = tri[k];
                    v.x = p2[i].x;
                    v.y = p2[i].y;
                    v.z = p3[i].z;
                    v.u = sky ? SKY_TEXEL : uv[i].x;
                    v.v = sky ? SKY_TEXEL : uv[i].y;
                }
                drawTexturedPolygon(dst, w, h, tri, map, REFLECTANCE);
            }
        }

        // flip the back-buffer onto the screen
        this.display_.draw();
    }
}
