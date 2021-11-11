/*
 * @file    main.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Main entry point for the Twister effect
 */

//----- imports
import { StatesManager, States } from "library/core/manager"
import { Display } from "library/core/display";
import { Twister } from "./twister";

//----- begin
// retrieve the canvas element from the page
let display = new Display(<HTMLCanvasElement> document.getElementById("output"));

// create a new instance of the Twister
let twister = new Twister(display);

// create states manager
let manager = StatesManager.getInstance();

// add a new transition
manager.add({event: States.S_BEGIN, from: undefined, to: twister});

// start
manager.start();
