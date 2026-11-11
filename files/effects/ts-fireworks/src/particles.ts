/*
 * @file    particles.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Fireworks particle pool (pure logic, no rendering)
 */

//----- globals
export const MAX_PARTICLES = 512;

const KIND_ROCKET = 0;
const KIND_SPARK = 1;
const SPARK_LIFE = 38; // about 1.5 s at 25 FPS

//----- classes
// seeded pseudo random generator (mulberry32), values in [0, 1)
export class Rng {
    private state_: number;

    constructor(seed: number) {
        this.state_ = seed >>> 0;
    }

    public next(): number {
        this.state_ = (this.state_ + 0x6d2b79f5) >>> 0;
        let t = this.state_;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

export class Particles {
    //----- members
    public count = 0; // number of live particles
    public x: Float32Array;
    public y: Float32Array;
    public vx: Float32Array;
    public vy: Float32Array;
    public life: Float32Array;
    public kind: Uint8Array;
    public color: Uint32Array;

    private max_: number;
    private rng_: Rng;

    //----- methods
    constructor(maxCount: number, rng: Rng) {
        this.max_ = maxCount;
        this.rng_ = rng;
        this.x = new Float32Array(maxCount);
        this.y = new Float32Array(maxCount);
        this.vx = new Float32Array(maxCount);
        this.vy = new Float32Array(maxCount);
        this.life = new Float32Array(maxCount);
        this.kind = new Uint8Array(maxCount);
        this.color = new Uint32Array(maxCount);
    }

    // add a rocket going up with speed vy (negative), false if the pool is full
    public spawnRocket(x: number, y: number, vy: number): boolean {
        if (this.count >= this.max_) {
            return false;
        }
        const i = this.count++;
        this.x[i] = x;
        this.y[i] = y;
        this.vx[i] = 0;
        this.vy[i] = vy;
        this.life[i] = 1;
        this.kind[i] = KIND_ROCKET;
        this.color[i] = 0xffffffff;
        return true;
    }

    // explode into count sparks around (x, y), limited by the pool room
    public burst(x: number, y: number, count: number, hue: number): void {
        const n = Math.min(count, this.max_ - this.count);
        for (let k = 0; k < n; k++) {
            const angle = this.rng_.next() * Math.PI * 2;
            const speed = 1 + this.rng_.next() * 3;
            const i = this.count++;
            this.x[i] = x;
            this.y[i] = y;
            this.vx[i] = Math.cos(angle) * speed;
            this.vy[i] = Math.sin(angle) * speed;
            this.life[i] = 1;
            this.kind[i] = KIND_SPARK;
            this.color[i] = hue;
        }
    }

    // move, age and remove dead particles (swap with the last one)
    public step(gravity: number): void {
        let i = 0;
        while (i < this.count) {
            this.x[i] += this.vx[i];
            this.y[i] += this.vy[i];
            this.vy[i] += gravity;
            if (this.kind[i] === KIND_SPARK) {
                this.life[i] -= 1 / SPARK_LIFE;
            }

            if (this.life[i] <= 0) {
                this.removeAt(i);
            } else {
                i++;
            }
        }
    }

    private removeAt(i: number): void {
        const last = --this.count;
        this.x[i] = this.x[last];
        this.y[i] = this.y[last];
        this.vx[i] = this.vx[last];
        this.vy[i] = this.vy[last];
        this.life[i] = this.life[last];
        this.kind[i] = this.kind[last];
        this.color[i] = this.color[last];
    }
}
