/*
 * @file    fireworks.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Fireworks effect in Typescript: a sprite on a white band (left),
 *          fireworks particles (right)
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { Display } from "library/core/display";
import { Surface } from "library/gfx/surface";
import { RGBA } from "library/color/RGBA";

import { Particles, Rng, MAX_PARTICLES } from "./particles";
import { layout, Layout } from "./layout";

//----- globals
export const FPS = 25; // fixed frame rate: the timeline is counted in frames
const LAUNCH_PERIOD = 12; // frames between two rockets (about five in flight at once)
const ROCKET_SPEED = -9; // initial rocket speed (up)
const GRAVITY = 0.15; // pulls the rockets and the sparks down
const SPARKS_MIN = 40;
const SPARKS_MAX = 80;
const SPARK_SIZE = 2; // radius of a spark (pixels)
const ROCKET_SIZE = 1.5; // radius of a rocket (pixels)
const ROCKET_COLOR = 0x3c9bff; // packed 0xBBGGRR: orange (visible on the white band)
const SEED = 0x2026;

//----- class
export class Fireworks extends IAnimation {
    //----- members
    private sprite_: Surface; // the sprite
    private layout_: Layout; // where the band and the sprite are drawn
    private rng_: Rng; // seeded random generator
    private particles_: Particles; // rockets and sparks
    private apex_: number[]; // positions (x, y pairs) of the rockets reaching their apex
    private black_: RGBA; // background

    //----- methods
    // constructor
    constructor(display: Display) {
        super("fireworks", display, FPS);

        this.sprite_ = new Surface();
        this.layout_ = layout(this.height_, 0, 0);
        this.rng_ = new Rng(SEED);
        this.particles_ = new Particles(MAX_PARTICLES, this.rng_);
        this.apex_ = [];
        this.black_ = new RGBA(0, 0, 0);
    }

    // load the assets
    protected init(): Promise<unknown> {
        return this.sprite_.loadImage("/images/assets/ts-fireworks.sprite.png").then(
            () => this.computeLayout(),
            () => this.computeLayout(),
        );
    }

    // compute the layout from the sprite size (0x0 if it could not be loaded), then scale the sprite to it
    private computeLayout(): void {
        const src = this.sprite_;
        this.layout_ = layout(this.height_, src.width, src.height);

        const { spriteW, spriteH } = this.layout_;
        if (spriteW === src.width && spriteH === src.height) {
            return;
        }

        const scaled = new Surface({ width: spriteW, height: spriteH });
        const from = src.data32;
        const to = scaled.data32;
        for (let y = 0; y < spriteH; y++) {
            const sy = Math.min(src.height - 1, Math.floor((y * src.height) / spriteH));
            for (let x = 0; x < spriteW; x++) {
                const sx = Math.min(src.width - 1, Math.floor((x * src.width) / spriteW));
                to[y * spriteW + x] = from[sy * src.width + sx];
            }
        }
        this.sprite_ = scaled;
    }

    // update the animation
    protected update(): void {
        const half = this.width_ / 2;

        // launch a rocket from the bottom of the right half
        if (this.frames_ % LAUNCH_PERIOD === 0) {
            const x = half + this.rng_.next() * (half - 1);
            this.particles_.spawnRocket(x, this.height_ - 1, ROCKET_SPEED);
        }

        // rockets reaching their apex explode: kill them, remember where
        this.apex_.length = 0;
        const p = this.particles_;
        for (let i = 0; i < p.count; i++) {
            if (p.kind[i] === 0 && p.vy[i] >= 0) {
                p.life[i] = 0;
                this.apex_.push(p.x[i], p.y[i]);
            }
        }

        p.step(GRAVITY);

        for (let i = 0; i < this.apex_.length; i += 2) {
            const count = SPARKS_MIN + Math.floor(this.rng_.next() * (SPARKS_MAX - SPARKS_MIN + 1));
            p.burst(this.apex_[i], this.apex_[i + 1], count, this.randomColor());
        }
    }

    // a bright packed 0xBBGGRR colour
    private randomColor(): number {
        const r = 128 + Math.floor(this.rng_.next() * 128);
        const g = 128 + Math.floor(this.rng_.next() * 128);
        const b = 128 + Math.floor(this.rng_.next() * 128);
        return r | (g << 8) | (b << 16);
    }

    // render the animation on the screen
    protected render(): void {
        const s = this.display_.surface;
        const l = this.layout_;

        // opaque black background (clear() leaves transparent pixels)
        for (let y = 0; y < this.height_; y++) {
            s.hline({ x: 0, y: y }, { x: this.width_ - 1, y: y }, this.black_);
        }

        // particles first, so the sprite covers them where it is opaque and they show through its transparent parts
        const p = this.particles_;
        for (let i = 0; i < p.count; i++) {
            if (p.kind[i] === 0) {
                s.disc(p.x[i], p.y[i], ROCKET_SIZE, ROCKET_COLOR);
            } else {
                s.disc(p.x[i], p.y[i], SPARK_SIZE, p.color[i], Math.min(1, 2 * p.life[i]));
            }
        }

        // sprite, pinned bottom-left
        if (l.spriteW > 0 && l.spriteH > 0) {
            s.blend({ x: l.spriteX, y: l.spriteY }, this.sprite_, undefined, 1.0);
        }

        // flip the back-buffer onto the screen
        this.display_.draw();
    }
}
