/*
 * @file    snake.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Snake movement for the text scroller: the letters of a text follow
 *          the path of a head wandering toward invisible apples
 */

//----- imports
import { Point2D, Size } from "library/core/interfaces";

//----- globals
export const SNAKE_SPEED = 2; // head speed (pixels per frame)
export const SNAKE_MAX_TURN = (3 * Math.PI) / 180; // max turn per frame (radians)

const APPLE_COUNT = 4; // number of apples alive at the same time
const APPLE_MIN_DX = 80; // a new apple is between 80 and 200 px on the left
const APPLE_MAX_DX = 200;
const APPLE_MARGIN = 40; // vertical margin for the apples
const APPLE_REACHED = 16; // distance at which an apple is "eaten"
const APPLE_TIMEOUT = 200; // frames before giving up on an apple

//----- functions

// random value in [a, b[
function random(a: number, b: number): number {
    return a + Math.random() * (b - a);
}

/* turn a heading toward a target angle, by at most maxTurn
 * (the shortest way, even across +/- PI)
 */
export function steer(heading: number, target: number, maxTurn: number): number {
    let diff = (target - heading) % (2 * Math.PI);
    if (diff > Math.PI) diff -= 2 * Math.PI;
    if (diff < -Math.PI) diff += 2 * Math.PI;

    return heading + Math.max(-maxTurn, Math.min(maxTurn, diff));
}

//----- interfaces
interface Apple {
    x: number;
    y: number;
    timer: number; // frames spent going to this apple
}

//----- class
export class Snake {
    //----- members
    private length_: number; // number of letters
    private lag_: number; // frames between two letters
    private area_: Size; // the area where the snake lives

    private head_: Point2D; // head position (centre of the first letter)
    private heading_: number; // head direction (radians, PI = left)
    private history_: Point2D[]; // previous head positions (newest first)

    private apples_: Apple[]; // the apples the snake is wandering toward
    private respawned_: number; // number of times the snake re-entered the screen

    //----- methods
    /* create a snake
     *
     * Args:
     *      length  : number of letters
     *      spacing : distance between two letters along the path
     *                (must be a multiple of SNAKE_SPEED)
     *      area    : the area where the snake lives
     */
    constructor(length: number, spacing: number, area: Size) {
        this.length_ = length;
        this.lag_ = Math.round(spacing / SNAKE_SPEED);
        this.area_ = area;
        this.respawned_ = 0;

        this.head_ = { x: 0, y: 0 };
        this.heading_ = Math.PI;
        this.history_ = [];
        this.apples_ = [];

        this.spawn();
    }

    // current head position
    public get head(): Point2D {
        return this.head_;
    }

    // the apple the head is currently heading to (the nearest one)
    public get apple(): Point2D {
        return this.target();
    }

    // all the apples alive
    public get apples(): Point2D[] {
        return this.apples_;
    }

    // number of times the snake re-entered the screen
    public get respawned(): number {
        return this.respawned_;
    }

    // centre of every letter, from the head to the tail
    public positions(): Point2D[] {
        const out: Point2D[] = [];
        for (let i = 0; i < this.length_; i++) {
            out.push(this.history_[i * this.lag_]);
        }
        return out;
    }

    // move the snake by one frame
    public update(): void {
        // the whole snake left the screen: it comes back on the right
        if (this.isOffScreen()) {
            this.respawned_++;
            this.spawn();
            return;
        }

        // eat the apples (or give up on them) and replace them
        for (let i = 0; i < this.apples_.length; i++) {
            const apple = this.apples_[i];
            apple.timer++;
            const dist = Math.hypot(apple.x - this.head_.x, apple.y - this.head_.y);
            if (dist < APPLE_REACHED || apple.timer > APPLE_TIMEOUT) {
                this.apples_[i] = this.newApple();
            }
        }

        // steer toward the nearest apple
        const target = this.target();
        const angle = Math.atan2(target.y - this.head_.y, target.x - this.head_.x);
        this.heading_ = steer(this.heading_, angle, SNAKE_MAX_TURN);
        this.heading_ = Math.atan2(Math.sin(this.heading_), Math.cos(this.heading_));

        // move the head (the letters always stay inside the area vertically)
        const half = this.lag_ * SNAKE_SPEED * 0.5;
        const x = this.head_.x + SNAKE_SPEED * Math.cos(this.heading_);
        const y = this.head_.y + SNAKE_SPEED * Math.sin(this.heading_);
        this.head_ = { x, y: Math.max(half, Math.min(this.area_.height - half, y)) };

        // the body follows the path of the head
        this.history_.unshift(this.head_);
        this.history_.length = (this.length_ - 1) * this.lag_ + 1;
    }

    // nearest apple from the head
    private target(): Point2D {
        let best = this.apples_[0];
        let bestDist = Infinity;
        for (const apple of this.apples_) {
            const dist = Math.hypot(apple.x - this.head_.x, apple.y - this.head_.y);
            if (dist < bestDist) {
                best = apple;
                bestDist = dist;
            }
        }
        return best;
    }

    // true when every letter is past the left side of the screen
    private isOffScreen(): boolean {
        const half = this.lag_ * SNAKE_SPEED * 0.5;
        return this.positions().every((p) => p.x + half < 0);
    }

    // (re)start the snake on the right side of the screen, heading left
    private spawn(): void {
        const spacing = this.lag_ * SNAKE_SPEED;
        const y = random(APPLE_MARGIN, this.area_.height - APPLE_MARGIN);

        this.head_ = { x: this.area_.width + spacing / 2, y };
        this.heading_ = Math.PI;

        // the body is a straight line behind the head
        this.history_ = [];
        for (let i = 0; i <= (this.length_ - 1) * this.lag_; i++) {
            this.history_.push({ x: this.head_.x + i * SNAKE_SPEED, y });
        }

        this.apples_ = [];
        for (let i = 0; i < APPLE_COUNT; i++) {
            this.apples_.push(this.newApple());
        }
    }

    // a new apple on the left of the head
    private newApple(): Apple {
        return {
            x: this.head_.x - random(APPLE_MIN_DX, APPLE_MAX_DX),
            y: random(APPLE_MARGIN, this.area_.height - APPLE_MARGIN),
            timer: 0,
        };
    }
}
