/*
 * @file    starfield.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Starfield effect in Typescript
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { Display } from "library/core/display";
import { Point2D, Point3D } from "library/core/interfaces";
import { Palette } from "library/color/palette";
import { Color } from "library/color/color";
import { RGBA } from "library/color/RGBA";

//----- globals
const NUMBER_OF_STARS = 2048;
export const ROTATION_STEP = (2 * Math.PI) / 180 / 100; // clockwise rotation per frame (2 degrees / 100 frames)

//----- functions
/* project a star on the screen, after a rotation around the view axis
 *
 * Args:
 *      x, y, z : star position
 *      angle   : rotation angle in radians (clockwise on screen, y goes down)
 *      cx, cy  : center of the screen
 */
export function project(x: number, y: number, z: number, angle: number, cx: number, cy: number): Point2D {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;

    return {
        x: cx + Math.floor((rx * 256) / (z + 384)),
        y: cy + Math.floor((ry * 256) / (z + 384)),
    };
}

//----- interface
interface Star {
    position: Point3D;
    speed: number;
    color: number;
    old_z: number;
}

//----- class
export class Starfield extends IAnimation {
    //----- members
    private stars_: Star[];
    private palette_: Palette;

    //----- methods
    constructor(display: Display) {
        super("starfield", display);

        // set the vars
        this.stars_ = [];
        this.palette_ = new Palette();

        // initialize the stars
        for (let i = 0; i < NUMBER_OF_STARS; i++) {
            this.initStar(i);
        }

        // initialize the palette
        this.createPalette();
    }

    // initialize a star
    private initStar(index: number): void {
        const z = -200.0 + 400 * Math.random();
        this.stars_[index] = {
            position: {
                x: -200.0 + 400 * Math.random(),
                y: -200.0 + 400 * Math.random(),
                z: z,
            },
            speed: 2 + Math.floor(2 * Math.random()),
            color: index % 256,
            old_z: z,
        };
    }

    // palette creation
    private createPalette(): void {
        this.palette_.setColor(0, Color.from(new RGBA(0, 0, 0)));
        for (let i = 0; i < 255; i++) {
            this.palette_.setColor(255 - i, Color.from(new RGBA(i, i, i)));
        }
    }

    // update the animation
    protected update(): void {
        // move the stars
        for (let i = 0; i < NUMBER_OF_STARS; i++) {
            const star: Star = this.stars_[i];
            star.old_z = star.position.z;
            star.position.z -= star.speed;
        }
    }

    // render the animation on the screen
    protected render(): void {
        // image backbuffer
        this.display_.surface.clear();

        // center of the screen
        const w = this.display_.width;
        const h = this.display_.height;
        const cx = w >> 1;
        const cy = h >> 1;

        // slow clockwise rotation of the whole field
        const angle = this.frames_ * ROTATION_STEP;

        // compute the 2D position of each stars
        for (let i = 0; i < NUMBER_OF_STARS; i++) {
            // retrieve the data for this star
            const star: Star = this.stars_[i];
            const { x, y, z } = star.position;

            const p = project(x, y, z, angle, cx, cy);
            const o = project(x, y, star.old_z, angle, cx, cy);

            if (p.x < 0 || p.x > w - 1 || p.y < 0 || p.y > h - 1) {
                this.initStar(i);
                continue;
            }

            // retrieve the correct color
            const c = <RGBA>this.palette_.getColor(star.color)!.color;
            this.display_.surface.line(o, p, c);
        }

        // flip the back-buffer onto the screen
        this.display_.draw();
    }
}
