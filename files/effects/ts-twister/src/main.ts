/*
 * @file    main.ts
 * @author  Sebastien LEGRAND
 * 
 * @brief   Main entry point for the Twister effect
 */

//----- imports
import { Display } from "library/core/display";
import { Twister } from "./twister";

//----- begin
// retrieve the canvas element from the page
let display = new Display(<HTMLCanvasElement> document.getElementById("output"));

// create a new instance of the Twister
let twister = new Twister(display);

// handler to start/stop the animation
window.onclick = (event) => {
    twister.toggle();
}

// run the animation
twister.run();
