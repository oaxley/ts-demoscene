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

    value: number,          // variable value for the sine wave
    incr: number,           // increment for the variable value

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
                                '/images/assets/ts-scroller.font-map.png',
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
            value: 1,
            incr: 1,
            xpos: display.width + FONT_CHAR_WIDTH,
            xmax: this.fontsfc_.width - FONT_CHAR_WIDTH,
            ypos: (cy, a, x, v, width) => {
                let y = cy + Math.floor(a * Math.sin(2 * Math.PI * v * x / width));
                return y;
            }
        }
    }

    // draw a text scroller in the surface
    private drawText(text: TextScroller): void {

        const cy = this.fontsfc_.height >> 1;
        let x = text.xpos;

        this.fontsfc_.clear();
        for (let i = text.begin; i < text.end; i++) {
            // retrieve the character data
            let chardata = this.fontmap_.getCharData(text.text.charAt(i));

            // compute the new position
            let y = text.ypos(cy, 40, x, text.value, this.display_.width);

            // copy the character on the font surface
            this.fontsfc_.putImgBlock(chardata, x, y);

            // break the loop before going off screen
            x += FONT_CHAR_WIDTH;
            if (x > text.xmax)
                break;
        }
    }

    // update the animation
    protected update(time?: number): void {
        if (!this.isAnimated)
            return;

        // draw the text on the font surface
        this.drawText(this.text_);

        // update the text position
        this.text_.end += 1;
        if (this.text_.end >= this.text_.text.length)
            this.text_.end = this.text_.text.length;

        this.text_.xpos -= 3;
        if (this.text_.xpos < 0) {
            this.text_.xpos = FONT_CHAR_WIDTH;
            this.text_.begin += 1;

            if (this.text_.begin >= this.text_.end) {
                this.text_.begin = 0;
                this.text_.end = 1;
                this.text_.xpos = this.display_.width + FONT_CHAR_WIDTH;

                this.text_.value += this.text_.incr;
                if ((this.text_.value < 0) || (this.text_.value > 4))
                    this.text_.incr *= -1;
            }
        }
    }

    // render the animation
    protected render(time?: number): void {
        if (!this.isAnimated)
            return;

        // surface clearing
        this.display_.surface.clear();

        // add the background sprite
        this.display_.surface.blend(
            {x: 0, y: 0},
            this.sprite_
        );

        // blend the font surface
        this.display_.surface.blend(
            {x: 0, y: this.display_.height >> 1},
            this.fontsfc_,
            {x: FONT_CHAR_WIDTH, y: 0, w: this.display_.width, h: this.fontsfc_.height},
            1.0,
            0xFF000000
        )

        this.display_.draw();

    }

    // setup function
    public setup(): void {
        this.sprite_
            .loadImage('/images/assets/ts-scroller.sprite.png')
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