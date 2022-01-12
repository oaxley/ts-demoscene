/*
 * @file    main.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Main entry point for the Starfield effect
 */

//----- imports
import { StatesManager, States } from "library/core/manager";
import { Display } from "library/core/display";
import { Starfield } from "./starfield";


//----- begin
// retrieve the canvas element from the page
let display = new Display(<HTMLCanvasElement> document.getElementById("output"));

// create a new instance of the effect
let effect = new Starfield(display);

// retrieve the instance of the states manager and add a new state transition
let manager = StatesManager.getInstance();
manager.add({event: States.S_BEGIN, from: undefined, to: effect});

// start the animation
manager.start();