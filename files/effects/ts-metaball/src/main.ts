/*
 * @file    main.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Main entry point for the Metaballs effect
 */

//----- imports
import { StatesManager, States } from "library/core/manager"
import { Display } from "library/core/display";
import { Metaballs } from "./metaballs";


//----- begin
// retrieve the canvas element from the page
let display = new Display(<HTMLCanvasElement> document.getElementById("output"));

// create a new instance of the effect
let effect = new Metaballs(display);

// create states manager
let manager = StatesManager.getInstance();

// add a new transition
manager.add({event: States.S_BEGIN, from: undefined, to: effect});

// start
manager.start();
