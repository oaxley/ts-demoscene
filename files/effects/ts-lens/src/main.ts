/*
 * @file    main.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Main entry point for the Lens effect
 */

//----- imports
import { Display } from "library/core/display";
import { Lens } from "./lens";

//----- begin
// retrieve the canvas element from the page
let display = new Display(<HTMLCanvasElement> document.getElementById("output"));

// create a new instance of the Lens
let lens = new Lens(display);

// handler to start/stop the animation
window.onclick = (event) => {
    lens.toggle();
}

// run the animation
lens.run();
