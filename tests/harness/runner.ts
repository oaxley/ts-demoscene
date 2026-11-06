/*
 * @file    runner.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Run an effect deterministically and hash the visible output
 */

//----- imports
import { createHash } from "crypto";
import { vi } from "vitest";

import { Display } from "library/core/display";
import { IAnimation } from "library/core/animation";
import { FakeCanvas } from "./dom";
import { seedRandom } from "./random";

//----- globals
export const WIDTH = 640;
export const HEIGHT = 480;

const SEED = 0xc0ffee;
const FAKE_NOW = 123456.789; // used as Noise seed through performance.now()
const T0 = 1000; // first timestamp (ms)
const DT = 50; // time between frames (ms), > 40ms throttles

//----- interfaces
export interface EffectResult {
    frames: number;
    checkpoints: Record<string, string>; // frame index -> hash of canvas
    final: string; // hash chained over all frames
}

type EffectClass = new (display: Display) => IAnimation;

//----- functions
// wait for pending asset loads (setTimeout based) to complete
async function settle(effect: IAnimation): Promise<void> {
    for (let i = 0; i < 200 && !effect.isAnimated; i++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
    if (!effect.isAnimated) {
        throw new Error(`Effect '${effect.name}' never started`);
    }
}

function hash(data: Uint8ClampedArray): string {
    return createHash("sha1").update(data).digest("hex").slice(0, 16);
}

/* run an effect for N frames
 *
 * Args:
 *      Effect   : the effect class
 *      frames   : number of frames to run
 *      every    : checkpoint period (in frames)
 */
export async function runEffect(Effect: EffectClass, frames = 200, every = 20): Promise<EffectResult> {
    seedRandom(SEED);

    const canvas = new FakeCanvas(WIDTH, HEIGHT);
    const display = new Display(canvas as unknown as HTMLCanvasElement);

    // pin performance.now() during construction & setup (Noise seed)
    const spy = vi.spyOn(performance, "now").mockReturnValue(FAKE_NOW);
    let effect: IAnimation;
    try {
        effect = new Effect(display);
        effect.setup();
    } finally {
        spy.mockRestore();
    }
    await settle(effect);

    const ctx = canvas.getContext("2d");
    const chain = createHash("sha1");
    const checkpoints: Record<string, string> = {};

    for (let i = 0; i < frames; i++) {
        effect.run(T0 + i * DT);

        const h = hash(ctx.buffer);
        chain.update(h);
        if (i % every === every - 1 || i === 0) {
            checkpoints[String(i)] = h;
        }
    }

    effect.cleanup();

    return {
        frames,
        checkpoints,
        final: chain.digest("hex").slice(0, 16),
    };
}
