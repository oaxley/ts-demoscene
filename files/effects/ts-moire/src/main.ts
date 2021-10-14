/*
 * @file    main.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Main entry point for the Moire effect
 */

//----- imports
import { Display } from "library/core/display";
import { Moire } from "./moire";

//----- begin
// retrieve the canvas element from the page
let display = new Display(<HTMLCanvasElement> document.getElementById("output"));

// create a new instance of the Moire
let moire = new Moire(display);

// handler to start/stop the animation
window.onclick = (event) => {
    moire.toggle();
}

// run the animation
moire.run();
