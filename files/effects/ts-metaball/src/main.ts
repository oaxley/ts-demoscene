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
let metaballs = new Metaballs(display);

// create states manager
let manager = new StatesManager();

// add a new transition
manager.add({event: States.S_BEGIN, from: undefined, to: metaballs});

// start
manager.start();
