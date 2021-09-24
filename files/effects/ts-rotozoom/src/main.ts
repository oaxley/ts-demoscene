/*
 * @file    main.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Main entry point for the Rotozoom effect
 */

//----- imports
import { Display } from "library/core/display";
import { Rotozoom } from "./rotozoom";

//----- begin
// retrieve the canvas element from the page
let display = new Display(<HTMLCanvasElement> document.getElementById("output"));

// create a new instance of the effect
let rotozoom = new Rotozoom(display);

// handler to start/stop the animation
window.onclick = (event) => {
    rotozoom.toggle();
}

// run the animation
rotozoom.run();