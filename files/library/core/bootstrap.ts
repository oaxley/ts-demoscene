/*
 * @file    bootstrap.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Start an animation in the page
 */

//----- imports
import { StatesManager, States } from "./manager";
import { Display } from "./display";
import { IAnimation } from "./animation";

//----- functions

/* create the effect on the page canvas and start it
 *
 * Args:
 *      Effect  : the animation class
 *      canvasId: id of the canvas element (default: "output")
 */
export function runEffect(Effect: new (display: Display) => IAnimation, canvasId: string = "output"): IAnimation {
    // retrieve the canvas element from the page
    const display = new Display(<HTMLCanvasElement>document.getElementById(canvasId));

    // create a new instance of the effect
    const effect = new Effect(display);

    // create the states manager, add the transition and start
    const manager = StatesManager.getInstance();
    manager.add({ event: States.S_BEGIN, from: undefined, to: effect });
    manager.start();

    return effect;
}
