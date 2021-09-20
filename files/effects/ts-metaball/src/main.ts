/*
 * @file    main.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Main entry point for the Metaballs effect
 */

//----- imports
import { Display } from "library/core/display";
import { Metaballs } from "./metaballs";

//----- begin
// retrieve the canvas element from the page
let display = new Display(<HTMLCanvasElement> document.getElementById("output"));

// create a new instance of the effect
let metaballs = new Metaballs(display);

// handler to start/stop the animation
window.onclick = (event) => {
    metaballs.toggle();
}

// run the animation
metaballs.run();
