/*
 * @file    scroller.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Text Scroller effect in Typescript
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { States } from "library/core/manager";

import { Display } from "library/core/display";
import { Surface } from "library/gfx/surface";
import { Font } from "library/gfx/font";


//----- globals
const FONT_CHAR_WIDTH  = 32;
const FONT_CHAR_HEIGHT = 32;


//----- interfaces
interface TextScroller {
    text: String,           // the string for this scroller
    begin: number,          // the begin index for the text
    end: number,            // the end index for the text

    xpos: number,           // the position of the scroller
    xmax: number,           // font surface max X value

    // the function to compute the y position
    // cy: the center line
    // a : amplitude of the sin wave
    // x : the current x position
    // v : the number of sine wave defined for the width
    // width : the maximum width of the screen
    ypos(cy: number, a: number, x: number, v: number, width: number): number;
}


//----- class
export class Scroller extends IAnimation {

    //----- members
    private fontmap_: Font;                 // the font map
    private fontsfc_: Surface;              // the surface where the text is drawn

    private sprite_: Surface;               // the background sprite

    private text_: TextScroller;            // the text scroller


    //----- methods
    constructor(display: Display) {
        super('text-scroller', display);

        // set the vars
        this.sprite_ = new Surface();

        // load the font map
        this.fontmap_ = new Font(
                                '/images/assets/font-map.asset.png',
                                {
                                    width: FONT_CHAR_WIDTH,
                                    height: FONT_CHAR_HEIGHT
                                }
        );

        // set the font surface wider than the actual display
        // so we don't have to do expensive calculations for clipping
        this.fontsfc_ = new Surface({
            width: display.width + 2 * FONT_CHAR_WIDTH,
            height: display.height >> 1
        });

        this.text_ = {
            text: "The sine wave of this scrolltext will change over time (this is quite boring in fact!)",
            begin: 0,
            end: 1,
            xpos: display.width + FONT_CHAR_WIDTH,
            xmax: this.fontsfc_.width - FONT_CHAR_WIDTH,
            ypos: (cy, a, x, v, width) => {
                let y = cy + Math.floor(a * Math.sin(2 * Math.PI * v * x / width));
                return y;
            }
        }
    }

    // update the animation
    protected update(time?: number): void {
        if (!this.isAnimated)
            return;
    }

    // render the animation
    protected render(time?: number): void {
        if (!this.isAnimated)
            return;
    }

    // setup function
    public setup(): void {
        this.sprite_
            .loadImage('/images/assets/ts-scroller.asset.png')
            .then(result => {
                // toggle the animation
                this.toggle();

                // set the click handler to pause the animation
                window.onclick = () => {
                    this.toggle();
                }

                console.log("Starting the Text Scroller animation")
            });
    }

    // cleanup function
    public cleanup(): void {
    }

    // run the animation
    public run(time: number|undefined): States {

        // update & render the animation
        this.update(time);
        this.render(time);

        // this animation will run indefinitely
        return States.S_RUNNING;
    }
}