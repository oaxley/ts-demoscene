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


//----- class
export class Scroller extends IAnimation {

    //----- members
    private fontmap_: Font;                 // the font map
    private fontsfc_: Surface;              // the surface where the text is drawn

    private sprite_: Surface;               // the background sprite


    //----- methods
    constructor(display: Display) {
        super('text-scroller', display);

        // set the vars
        this.sprite_ = new Surface();

        // load the font map
        this.fontmap_ = new Font(
                                '/images/assets/font-maop.asset.png',
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
        })
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