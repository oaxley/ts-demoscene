/*
 * @file    effects.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Frame-hash regression tests: each effect must render exactly the
 *          same pixels as the golden reference (tests/golden/<effect>.json).
 *
 *          Update the references (only when a visual change is intended):
 *              npx vitest run -u
 */

//----- imports
import { describe, test, expect } from "vitest";
import { runEffect } from "./harness/runner";

import { Flames } from "../files/effects/ts-flames/src/flames";
import { Glenz } from "../files/effects/ts-glenz/src/glenz";
import { Lens } from "../files/effects/ts-lens/src/lens";
import { Metaballs } from "../files/effects/ts-metaball/src/metaballs";
import { Moire } from "../files/effects/ts-moire/src/moire";
import { ImgNoise } from "../files/effects/ts-noise/src/noise";
import { Plasma } from "../files/effects/ts-plasma/src/plasma";
import { RasterBars } from "../files/effects/ts-raster/src/raster";
import { Rotozoom } from "../files/effects/ts-rotozoom/src/rotozoom";
import { Scroller } from "../files/effects/ts-scroller/src/scroller";
import { Smoke } from "../files/effects/ts-smoke/src/smoke";
import { Sprites } from "../files/effects/ts-sprites/src/sprites";
import { Starfield } from "../files/effects/ts-starfield/src/starfield";
import { Tunnel } from "../files/effects/ts-tunnel/src/tunnel";
import { Twister } from "../files/effects/ts-twister/src/twister";
import { Water } from "../files/effects/ts-water/src/water";


//----- globals
const EFFECTS = {
    "ts-flames": Flames,
    "ts-glenz": Glenz,
    "ts-lens": Lens,
    "ts-metaball": Metaballs,
    "ts-moire": Moire,
    "ts-noise": ImgNoise,
    "ts-plasma": Plasma,
    "ts-raster": RasterBars,
    "ts-rotozoom": Rotozoom,
    "ts-scroller": Scroller,
    "ts-smoke": Smoke,
    "ts-sprites": Sprites,
    "ts-starfield": Starfield,
    "ts-tunnel": Tunnel,
    "ts-twister": Twister,
    "ts-water": Water,
};


//----- tests
describe("effects render identical frames", () => {
    test.each(Object.entries(EFFECTS))("%s", async (name, Effect) => {
        const result = await runEffect(Effect);
        await expect(JSON.stringify(result, null, 4) + "\n")
            .toMatchFileSnapshot(`golden/${name}.json`);
    });
});
