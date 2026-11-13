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

//----- class
export class Snake {
    //----- members
    private length_: number; // number of letters
    private lag_: number; // frames between two letters
    private area_: Size; // the area where the snake lives

    private head_: Point2D; // head position (centre of the first letter)
    private heading_: number; // head direction (radians, PI = left)
    private history_: Point2D[]; // previous head positions (newest first)

    private apple_: Point2D; // the apple the snake is heading to
    private timer_: number; // frames spent going to the current apple
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
        this.apple_ = { x: 0, y: 0 };
        this.timer_ = 0;

        this.spawn();
    }

    // current head position
    public get head(): Point2D {
        return this.head_;
    }

    // current target
    public get apple(): Point2D {
        return this.apple_;
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

        // eat the apple (or give up) and look for the next one
        this.timer_++;
        const dist = Math.hypot(this.apple_.x - this.head_.x, this.apple_.y - this.head_.y);
        if (dist < APPLE_REACHED || this.timer_ > APPLE_TIMEOUT) {
            this.newApple();
        }

        // steer toward the apple
        const target = Math.atan2(this.apple_.y - this.head_.y, this.apple_.x - this.head_.x);
        this.heading_ = steer(this.heading_, target, SNAKE_MAX_TURN);
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

        this.newApple();
    }

    // pick a new apple on the left of the head
    private newApple(): void {
        this.apple_ = {
            x: this.head_.x - random(APPLE_MIN_DX, APPLE_MAX_DX),
            y: random(APPLE_MARGIN, this.area_.height - APPLE_MARGIN),
        };
        this.timer_ = 0;
    }
}
