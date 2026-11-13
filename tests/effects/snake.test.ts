/*
 * @file    snake.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   ts-scroller snake movement
 */

//----- imports
import { describe, test, expect, beforeEach } from "vitest";

import { Snake, steer, SNAKE_SPEED } from "../../files/effects/ts-scroller/src/snake";
import { seedRandom } from "../harness/random";

//----- tests
describe("ts-scroller snake steering", () => {
    test("turns toward the target by at most maxTurn", () => {
        expect(steer(0, 1, 0.05)).toBeCloseTo(0.05, 12);
        expect(steer(0, -1, 0.05)).toBeCloseTo(-0.05, 12);
        expect(steer(0, 0.01, 0.05)).toBeCloseTo(0.01, 12);
    });

    test("takes the shortest way across +/- PI", () => {
        // from 3 rad to -3 rad, the shortest way is to keep turning positively
        expect(steer(3, -3, 0.1)).toBeCloseTo(3.1, 12);
        expect(steer(-3, 3, 0.1)).toBeCloseTo(-3.1, 12);
    });
});

describe("ts-scroller snake movement", () => {
    const AREA = { width: 640, height: 240 };
    const LENGTH = 15;
    const SPACING = 32;

    beforeEach(() => seedRandom(1234));

    test("starts off-screen on the right, heading left, letters 32 px apart", () => {
        const snake = new Snake(LENGTH, SPACING, AREA);
        const p = snake.positions();

        expect(p).toHaveLength(LENGTH);
        expect(p[0].x).toBeGreaterThanOrEqual(AREA.width);
        for (let i = 1; i < LENGTH; i++) {
            expect(p[i].x - p[i - 1].x).toBeCloseTo(SPACING, 9);
            expect(p[i].y).toBeCloseTo(p[0].y, 9);
        }

        // heading left (the head may already turn a little toward the apple)
        snake.update();
        expect(snake.head.x).toBeCloseTo(p[0].x - SNAKE_SPEED, 1);
    });

    test("the head moves at a constant speed", () => {
        const snake = new Snake(LENGTH, SPACING, AREA);
        for (let f = 0; f < 500; f++) {
            const before = { ...snake.head };
            snake.update();
            if (snake.respawned > 0) break;
            const d = Math.hypot(snake.head.x - before.x, snake.head.y - before.y);
            expect(d).toBeLessThanOrEqual(SNAKE_SPEED + 1e-9);
        }
    });

    test("the body follows the exact path of the head", () => {
        const snake = new Snake(LENGTH, SPACING, AREA);
        const heads: { x: number; y: number }[] = [];
        const lag = SPACING / SNAKE_SPEED;

        for (let f = 0; f < 400; f++) {
            snake.update();
            heads.push({ ...snake.head });
            if (f >= lag) {
                const p = snake.positions();
                expect(p[1].x).toBeCloseTo(heads[f - lag].x, 9);
                expect(p[1].y).toBeCloseTo(heads[f - lag].y, 9);
            }
        }
    });

    test("several apples are alive at the same time", () => {
        const snake = new Snake(LENGTH, SPACING, AREA);
        expect(snake.apples).toHaveLength(4);
        expect(new Set(snake.apples).size).toBe(4);
    });

    test("a new apple is always further left than the head", () => {
        const snake = new Snake(LENGTH, SPACING, AREA);
        let known = new Set(snake.apples);
        let changes = 0;

        for (let f = 0; f < 3000 && snake.respawned === 0; f++) {
            snake.update();
            for (const apple of snake.apples) {
                if (!known.has(apple)) {
                    expect(apple.x).toBeLessThanOrEqual(snake.head.x - 80);
                    changes++;
                }
            }
            known = new Set(snake.apples);
        }
        expect(changes).toBeGreaterThan(0);
    });

    test("respawns on the right only once the whole snake left the screen", () => {
        const snake = new Snake(LENGTH, SPACING, AREA);
        let previous = snake.positions();

        for (let f = 0; f < 20000 && snake.respawned < 3; f++) {
            const count = snake.respawned;
            snake.update();

            if (snake.respawned > count) {
                // the whole snake was off the left side of the screen
                for (const p of previous) expect(p.x + SPACING / 2).toBeLessThan(0);

                // and it comes back from the right, in the upper half
                expect(snake.head.x).toBeGreaterThanOrEqual(AREA.width);
                expect(snake.head.y).toBeGreaterThanOrEqual(SPACING / 2);
                expect(snake.head.y).toBeLessThanOrEqual(AREA.height - SPACING / 2);
            }
            previous = snake.positions();
        }
        expect(snake.respawned).toBe(3);
    });

    test("letters never leave the area vertically", () => {
        const snake = new Snake(LENGTH, SPACING, AREA);
        for (let f = 0; f < 20000; f++) {
            snake.update();
            for (const p of snake.positions()) {
                expect(p.y - SPACING / 2).toBeGreaterThanOrEqual(0);
                expect(p.y + SPACING / 2).toBeLessThanOrEqual(AREA.height);
            }
        }
    });
});
