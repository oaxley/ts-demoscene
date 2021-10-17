/*
 * @file    main.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Main entry point for the Flames effect
 */

//----- imports
import { Display } from "library/core/display";
import { Flames } from "./flames";
import { StatesManager, States } from "library/core/manager"


//----- begin
// retrieve the canvas element from the page
let display = new Display(<HTMLCanvasElement> document.getElementById("output"));

// create a new instance of the flames
let flames = new Flames(display);

// create states manager
let manager = new StatesManager();

// add a new transition
manager.add({event: States.S_BEGIN, from: undefined, to: flames});

// start
manager.start();
