/*
 * @file    main.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Main entry point for the Plasma effect
 */

//----- imports
import { Display } from "library/core/display";
import { Plasma } from "./plasma";

//----- begin
// retrieve the canvas element from the page
let display = new Display(<HTMLCanvasElement> document.getElementById("output"));

// create a new instance of the plasma
let plasma = new Plasma(display);

// handler to stop/start the animation
window.onclick = (event) => {
    plasma.toggle();
}

// run the animation
plasma.run();