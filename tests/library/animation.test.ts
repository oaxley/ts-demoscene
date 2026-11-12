/*
 * @file    animation.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Unit tests for the IAnimation life cycle
 */

//----- imports
import { describe, test, expect, vi } from "vitest";

import { IAnimation } from "library/core/animation";
import { Display } from "library/core/display";
import { States } from "library/core/manager";
import { FakeCanvas } from "../harness/dom";

//----- helpers
class Probe extends IAnimation {
    public calls: string[] = [];
    public ready: Promise<unknown> | undefined;

    constructor(fps?: number) {
        super("probe", new Display(new FakeCanvas(4, 4) as unknown as HTMLCanvasElement), fps);
    }

    public get frames(): number {
        return this.frames_;
    }

    protected init(): Promise<unknown> | void {
        return this.ready;
    }

    protected update(time: number): void {
        this.calls.push(`u${time}`);
    }

    protected render(time: number): void {
        this.calls.push(`r${time}`);
    }
}

// only defines update(): render() must default to drawing the back-buffer
class UpdateOnly extends IAnimation {
    constructor() {
        super("update-only", new Display(new FakeCanvas(4, 4) as unknown as HTMLCanvasElement));
    }

    public get display(): Display {
        return this.display_;
    }

    protected update(): void {}
}

//----- tests
describe("IAnimation", () => {
    test("does nothing until started, then updates and renders each frame", () => {
        const a = new Probe();
        expect(a.run(1)).toBe(States.S_RUNNING);
        expect(a.calls).toEqual([]);

        a.setup();
        expect(a.isAnimated).toBe(true);
        a.run(2);
        a.run(3);
        expect(a.calls).toEqual(["u2", "r2", "u3", "r3"]);
        expect(a.frames).toBe(2);
    });

    test("waits for init() before starting", async () => {
        const a = new Probe();
        let resolve!: () => void;
        a.ready = new Promise<void>((r) => (resolve = r));
        a.setup();
        expect(a.isAnimated).toBe(false);

        resolve();
        await a.ready;
        await Promise.resolve();
        expect(a.isAnimated).toBe(true);
    });

    test("a click toggles the animation", () => {
        const a = new Probe();
        a.setup();
        (window.onclick as () => void)();
        a.run(1);
        expect(a.isAnimated).toBe(false);
        expect(a.frames).toBe(0);
    });

    test("frame rate limiter", () => {
        const a = new Probe(25); // 40 ms
        a.setup();
        for (const t of [0, 20, 40, 41, 60, 81, 82, 200]) {
            a.run(t);
        }
        expect(a.calls.filter((c) => c[0] == "u")).toEqual(["u41", "u82", "u200"]);
    });

    test("render() draws the back-buffer by default", () => {
        const a = new UpdateOnly();
        const draw = vi.spyOn(a.display, "draw");
        a.setup();
        a.run(1);
        a.run(2);
        expect(draw).toHaveBeenCalledTimes(2);
    });
});
