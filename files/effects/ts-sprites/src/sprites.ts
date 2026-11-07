/*
 * @file    sprites.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Sprites effect in Typescript
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { Display } from "library/core/display";
import { Surface } from "library/gfx/surface";
import { Point2D } from "library/core/interfaces";
import { Vector2D } from "library/maths/vector2d";
import { RGBA } from "library/color/RGBA";

//----- globals
const NUM_PARTICULES = 100;

//----- interfaces
interface Particule {
    p: Point2D;
    inc: Vector2D;
}

interface Sprite {
    image: Surface;
    pos: Point2D;
    inc: number;
}

//----- class
export class Sprites extends IAnimation {
    //----- members
    private sprite_: Sprite; // the sprite
    private particules_: Particule[]; // particule elements
    private px_: Int32Array; // integer X positions (scratch)
    private py_: Int32Array; // integer Y positions (scratch)

    //----- methods
    // constructor
    constructor(display: Display) {
        super("sprites", display);

        // set the vars
        this.sprite_ = {
            image: new Surface(),
            pos: { x: 0, y: 0 },
            inc: -1,
        };

        // create the particules
        this.particules_ = [];
        this.px_ = new Int32Array(NUM_PARTICULES);
        this.py_ = new Int32Array(NUM_PARTICULES);
        this.createParticules();
    }

    private createParticules(): void {
        for (let i = 0; i < NUM_PARTICULES; i++) {
            // find a random point
            const p: Point2D = {
                x: Math.floor(Math.random() * this.display_.width),
                y: Math.floor(Math.random() * this.display_.height),
            };

            // increment is between -1 and 1
            const v: Vector2D = new Vector2D(-1 + Math.random() * 2, -1 + Math.random() * 2);

            this.particules_.push({ p: p, inc: v });
        }
    }

    // load the assets
    protected init(): Promise<unknown> {
        return this.sprite_.image.loadImage("/images/assets/ts-sprites.sprite.png").then(() => {
            // put the sprite on the right side
            this.sprite_.pos = {
                x: this.display_.width - this.sprite_.image.width,
                y: 0,
            };
        });
    }

    // update the animation
    protected update(): void {
        // update the particules
        for (let i = 0; i < this.particules_.length; i++) {
            // update the X value
            this.particules_[i].p.x += this.particules_[i].inc.x;
            if (this.particules_[i].p.x > this.display_.width || this.particules_[i].p.x < 0) {
                this.particules_[i].inc.x *= -1;
                this.particules_[i].p.x += this.particules_[i].inc.x;
            }

            // update the Y value
            this.particules_[i].p.y += this.particules_[i].inc.y;
            if (this.particules_[i].p.y > this.display_.height || this.particules_[i].p.y < 0) {
                this.particules_[i].inc.y *= -1;
                this.particules_[i].p.y += this.particules_[i].inc.y;
            }
        }

        // move the sprite right & left
        let x = this.sprite_.pos.x;
        x = x + this.sprite_.inc;
        if (x <= 0 || x > this.display_.width - this.sprite_.image.width) {
            this.sprite_.inc *= -1;
        }
        this.sprite_.pos.x = x;
    }

    // render the animation on the screen
    protected render(): void {
        const s = this.display_.surface;
        s.clear();

        const c1 = new RGBA(255, 255, 255);
        const c2 = new RGBA(255, 0, 0);

        // integer positions of the particules
        const n = this.particules_.length;
        const px = this.px_;
        const py = this.py_;
        for (let i = 0; i < n; i++) {
            px[i] = Math.floor(this.particules_[i].p.x);
            py[i] = Math.floor(this.particules_[i].p.y);
        }

        // draw the links between close particules, otherwise a dot
        // (the dot is drawn again only if a line was drawn since the last one)
        for (let i = 0; i < n; i++) {
            const x1 = px[i];
            const y1 = py[i];
            let dirty = true;

            for (let j = 0; j < n; j++) {
                if (i == j) {
                    continue;
                }

                const xd = x1 - px[j];
                const yd = y1 - py[j];

                if (xd * xd + yd * yd < 2500) {
                    s.line({ x: x1, y: y1 }, { x: px[j], y: py[j] }, c1);
                    dirty = true;
                } else if (dirty) {
                    s.setPixel(x1, y1, c2);
                    s.setPixel(x1 + 1, y1, c2);
                    s.setPixel(x1, y1 + 1, c2);
                    s.setPixel(x1 + 1, y1 + 1, c2);
                    dirty = false;
                }
            }
        }

        // add the sprite
        this.display_.surface.blend(this.sprite_.pos, this.sprite_.image);

        // flip the back-buffer onto the screen
        this.display_.draw();
    }
}
