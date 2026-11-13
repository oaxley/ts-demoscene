/*
 * @file    voxel.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Scroll text painted on a voxel landscape
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { Display } from "library/core/display";
import { Font } from "library/gfx/font";
import { RGBA } from "library/color/RGBA";

import { Terrain, MAP_SIZE } from "./terrain";

//----- globals
const TERRAIN_SEED = 0x5eed;

const FONT_SIZE = 32;
const TEXT = "    Hello voxel world ... the text rides over the hills and down the valleys ...    ";
const TEXT_SCALE = 2; // width of a glyph pixel in map texels
const TEXT_DEPTH = 4; // depth of a glyph pixel in map texels (perspective)
const TEXT_AHEAD = 90; // distance of the near edge of the text band
const TEXT_SPEED = 2; // scroll speed in texels per frame
const TEXT_TINT = RGBA.toUInt32(0xff, 0xd8, 0x90);

const DRAW_DISTANCE = 400;
const HORIZON = 100; // screen line of the horizon
const HEIGHT_SCALE = 240; // vertical projection factor
export const RELIEF = 0.3; // terrain heights (0..255) to world units
const FOV = 1.0; // tan of the half field of view

const CAMERA_SPEED = 1.5; // map units per frame
const CAMERA_CLEARANCE = 55; // altitude above the terrain ahead
const CAMERA_FLOOR = 20; // minimum altitude above the ground
const CAMERA_SPRING = 0.002; // pull toward the target altitude
const CAMERA_DAMPING = 0.06; // vertical speed damping
const CAMERA_MAX_ACCEL = 0.04; // max change of vertical speed per frame
const CAMERA_MAX_SPEED = 0.5; // max vertical speed per frame

const SKY_TOP = [10, 16, 48];
const SKY_HORIZON = [150, 170, 200];

//----- interfaces
export interface Camera {
    x: number;
    y: number;
    z: number; // altitude
    vz: number; // vertical speed
    angle: number; // yaw (0 = looking toward +y)
}

//----- functions
/* altitude the camera aims for: above the average ground from the camera to
 * the text band (so the text stays in view), and well above the hills just
 * ahead
 */
export function cruiseAltitude(cam: Camera, terrain: Terrain): number {
    let sum = 0;
    let near = 0;
    const ahead = [0, 30, 60, 90, 130, 170, 210];
    for (const d of ahead) {
        const h = RELIEF * terrain.heightAt(cam.x + d * Math.sin(cam.angle), cam.y + d * Math.cos(cam.angle));
        sum += h;
        if (d <= 90 && h > near) near = h;
    }
    return Math.max(sum / ahead.length + CAMERA_CLEARANCE, near + 2 * CAMERA_FLOOR);
}

// move the camera forward with a slow sway, its altitude following the ground
export function moveCamera(cam: Camera, terrain: Terrain, frame: number): void {
    cam.angle = 0.15 * Math.sin(frame * 0.007);
    cam.x += 0.6 * Math.sin(frame * 0.01) + CAMERA_SPEED * Math.sin(cam.angle);
    cam.y += CAMERA_SPEED * Math.cos(cam.angle);

    // ease toward the target altitude: a damped spring with bounded speed and
    // acceleration, so the flight never jolts
    const target = cruiseAltitude(cam, terrain);
    const accel = (target - cam.z) * CAMERA_SPRING - cam.vz * CAMERA_DAMPING;
    cam.vz += Math.max(-CAMERA_MAX_ACCEL, Math.min(CAMERA_MAX_ACCEL, accel));
    cam.vz = Math.max(-CAMERA_MAX_SPEED, Math.min(CAMERA_MAX_SPEED, cam.vz));
    cam.z += cam.vz;

    // safety net: never under the ground
    cam.z = Math.max(cam.z, RELIEF * terrain.heightAt(cam.x, cam.y) + CAMERA_FLOOR);
}

/* number of glyphs in the text band and its left edge (map x)
 *
 * The band is as wide as possible without wrapping onto itself: the glyphs plus
 * the scroll offset (< one glyph) fit in the map width. It is centred on the
 * camera; only the far corners of the screen may miss a few letters.
 */
export function textLayout(camx: number): { count: number; cx: number; size: number } {
    const size = FONT_SIZE * TEXT_SCALE;
    const count = Math.floor(MAP_SIZE / size) - 1;
    const cx = Math.floor(camx - ((count - 1) * size) / 2);
    return { count, cx, size };
}

//----- class
export class Voxel extends IAnimation {
    //----- members
    private font_: Font;
    private terrain_: Terrain;
    private camera_: Camera;
    private scroll_: number; // scroll position of the text in texels

    private sky_: Uint32Array; // pre-computed sky gradient (whole screen)
    private ybuffer_: Int32Array; // highest drawn line per column
    private fog_: number[]; // sky colour at the horizon (fog colour)

    //----- methods
    constructor(display: Display) {
        super("voxel", display);

        this.font_ = new Font("/images/assets/ts-voxel.font-map.png", { width: FONT_SIZE, height: FONT_SIZE });
        this.terrain_ = new Terrain(TERRAIN_SEED);
        this.camera_ = { x: 0, y: 0, z: 0, vz: 0, angle: 0 };
        this.scroll_ = 0;

        this.ybuffer_ = new Int32Array(this.width_);
        this.fog_ = SKY_HORIZON;
        this.sky_ = new Uint32Array(this.width_ * this.height_);
        for (let y = 0; y < this.height_; y++) {
            const t = Math.min(1, y / HORIZON);
            const c = RGBA.toUInt32(
                SKY_TOP[0] + (SKY_HORIZON[0] - SKY_TOP[0]) * t,
                SKY_TOP[1] + (SKY_HORIZON[1] - SKY_TOP[1]) * t,
                SKY_TOP[2] + (SKY_HORIZON[2] - SKY_TOP[2]) * t,
            );
            this.sky_.fill(c, y * this.width_, (y + 1) * this.width_);
        }

        // first position of the camera, already at its cruising altitude
        moveCamera(this.camera_, this.terrain_, 0);
        this.camera_.z = cruiseAltitude(this.camera_, this.terrain_);
    }

    // paint the visible part of the text in the band ahead of the camera
    private paintText(): void {
        const { count, cx, size } = textLayout(this.camera_.x);

        const first = Math.floor(this.scroll_ / size);
        const glyphs: Uint32Array[] = [];
        for (let i = 0; i < count; i++) {
            glyphs.push(this.font_.getCharPixels(TEXT.charAt((first + i) % TEXT.length)));
        }

        const cy = Math.floor(this.camera_.y + TEXT_AHEAD);
        this.terrain_.paintStrip(glyphs, FONT_SIZE, TEXT_SCALE, cx, cy, this.scroll_ % size, TEXT_TINT, TEXT_DEPTH);
    }

    // wait for the font before starting
    protected init(): Promise<unknown> {
        return this.font_.loaded;
    }

    // update the animation
    protected update(): void {
        this.terrain_.restoreStrip();
        moveCamera(this.camera_, this.terrain_, this.frames_);
        this.scroll_ = (this.scroll_ + TEXT_SPEED) % (TEXT.length * FONT_SIZE * TEXT_SCALE);
        this.paintText();
    }

    // render the terrain, front to back
    protected render(): void {
        const w = this.width_;
        const h = this.height_;
        const cam = this.camera_;
        const out = this.display_.surface.data32;
        const height = this.terrain_.height;
        const color = this.terrain_.color;
        const ybuf = this.ybuffer_;

        out.set(this.sky_);
        ybuf.fill(h);

        const sin = Math.sin(cam.angle);
        const cos = Math.cos(cam.angle);
        const [fr, fg, fb] = this.fog_;

        for (let dz = 1; dz < DRAW_DISTANCE; dz += 1 + dz * 0.01) {
            // ends of the depth line (left & right of the screen)
            const cx = cam.x + sin * dz;
            const cy = cam.y + cos * dz;
            const rx = cos * dz * FOV;
            const ry = -sin * dz * FOV;
            let px = cx - rx;
            let py = cy - ry;
            const stepx = (2 * rx) / w;
            const stepy = (2 * ry) / w;

            const fog = dz / DRAW_DISTANCE;
            const keep = 1 - fog;
            const scale = HEIGHT_SCALE / dz;

            for (let col = 0; col < w; col++) {
                const i = this.terrain_.index(px, py);
                px += stepx;
                py += stepy;

                const top = Math.floor((cam.z - RELIEF * height[i]) * scale + HORIZON);
                if (top >= ybuf[col]) continue;

                const c = color[i];
                const pixel = RGBA.toUInt32(
                    (c & 0xff) * keep + fr * fog,
                    ((c >>> 8) & 0xff) * keep + fg * fog,
                    ((c >>> 16) & 0xff) * keep + fb * fog,
                );

                for (let y = Math.max(top, 0); y < ybuf[col]; y++) {
                    out[y * w + col] = pixel;
                }
                ybuf[col] = top;
            }
        }

        this.display_.draw();
    }
}
