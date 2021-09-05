/*
 * @file    main.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Main entry point for the Flames effect
 */

//----- imports
import { Display } from "library/core/display";
import { Flames } from "./flames";


//----- begin
// retrieve the canvas element from the page
let display = new Display(<HTMLCanvasElement> document.getElementById("output"));

// create a new instance of the flames
let flames = new Flames(display);

// handler to start/stop the animation
window.onclick = (event) => {
    flames.toggle();
}

// run the animation
flames.run();
