/*
 * @file    main.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Main entry point for the Plasma effect
 */

//----- imports
import { StatesManager, States } from "library/core/manager"
import { Display } from "library/core/display";
import { Plasma } from "./plasma";

//----- begin
// retrieve the canvas element from the page
let display = new Display(<HTMLCanvasElement> document.getElementById("output"));

// create a new instance of the plasma
let plasma = new Plasma(display);

// create states manager
let manager = new StatesManager();

// add a new transition
manager.add({event: States.S_BEGIN, from: undefined, to: plasma});

// start
manager.start();
