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
    private fontmap_: Font;


    //----- methods
    constructor(display: Display) {
        super('text-scroller', display);

        // load the font map
        this.fontmap_ = new Font(
                                '/images/assets/font-maop.asset.png',
                                {
                                    width: FONT_CHAR_WIDTH,
                                    height: FONT_CHAR_HEIGHT
                                }
        );

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