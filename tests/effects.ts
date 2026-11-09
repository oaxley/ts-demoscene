/*
 * @file    effects.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   List of all the effects (tests only)
 */

//----- imports
import { Brush } from "../files/effects/ts-brush/src/brush";
import { Bump } from "../files/effects/ts-bump/src/bump";
import { Cube } from "../files/effects/ts-cube/src/cube";
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
export const EFFECTS = {
    "ts-brush": Brush,
    "ts-bump": Bump,
    "ts-cube": Cube,
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
