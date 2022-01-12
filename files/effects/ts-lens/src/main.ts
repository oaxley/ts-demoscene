/*
 * @file    main.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Main entry point for the Lens effect
 */

//----- imports
import { StatesManager, States } from "library/core/manager";
import { Display } from "library/core/display";
import { Lens } from "./lens";


//----- begin
// retrieve the canvas element from the page
let display = new Display(<HTMLCanvasElement> document.getElementById("output"));

// create a new instance of the effect
let effect = new Lens(display);

// create the states manager and add a new transition to it
let manager = StatesManager.getInstance();

// add a new transition
manager.add({event: States.S_BEGIN, from: undefined, to: effect});

// start the manager
manager.start();