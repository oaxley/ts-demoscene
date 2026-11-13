/*
 * @file    scroller.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Text Scroller effect in Typescript
 */

//----- imports
import { IAnimation } from "library/core/animation";

import { Display } from "library/core/display";
import { Surface } from "library/gfx/surface";
import { Font } from "library/gfx/font";
import { RGBA } from "library/color/RGBA";

import { Snake } from "./snake";

//----- globals
const FONT_CHAR_WIDTH = 32;
const FONT_CHAR_HEIGHT = 32;

// the text of the snake, wandering in the upper half of the screen
const SNAKE_TEXT = "Snake Scroller";
// average colour of the girl's sprite (#8c9598)
const SNAKE_COLOR = { r: 0x8c, g: 0x95, b: 0x98 };

//----- interfaces
interface TextScroller {
    text: string; // the string for this scroller
    begin: number; // the begin index for the text
    end: number; // the end index for the text

    value: number; // variable value for the sine wave
    incr: number; // increment for the variable value

    xpos: number; // the position of the scroller
    xmax: number; // font surface max X value

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
    private fontmap_: Font; // the font map
    private fontsfc_: Surface; // the surface where the text is drawn

    private sprite_: Surface; // the background sprite

    private text_: TextScroller; // the text scroller

    private snake_: Snake; // the snake movement
    private snakesfc_: Surface; // the surface where the snake is drawn

    //----- methods
    constructor(display: Display) {
        super("text-scroller", display);

        // set the vars
        this.sprite_ = new Surface();

        // load the font map
        this.fontmap_ = new Font("/images/assets/ts-scroller.font-map.png", {
            width: FONT_CHAR_WIDTH,
            height: FONT_CHAR_HEIGHT,
        });

        // set the font surface wider than the actual display
        // so we don't have to do expensive calculations for clipping
        this.fontsfc_ = new Surface({
            width: display.width + 2 * FONT_CHAR_WIDTH,
            height: display.height >> 1,
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
                const y = cy + Math.floor(a * Math.sin((2 * Math.PI * v * x) / width));
                return y;
            },
        };

        // the snake lives in the upper half of the display
        const area = { width: display.width, height: display.height >> 1 };
        this.snake_ = new Snake(SNAKE_TEXT.length, FONT_CHAR_WIDTH, area);
        this.snakesfc_ = new Surface(area);
    }

    // colour the glyph pixels with SNAKE_COLOR, keeping their brightness (the
    // font is white on black, so the brightness is the anti-aliasing alpha)
    private tint(pixels: Uint32Array): Uint32Array {
        const out = new Uint32Array(pixels.length);
        for (let i = 0; i < pixels.length; i++) {
            const k = pixels[i] & 0xff; // red channel = brightness
            out[i] = RGBA.toUInt32(
                (SNAKE_COLOR.r * k) >> 8,
                (SNAKE_COLOR.g * k) >> 8,
                (SNAKE_COLOR.b * k) >> 8,
                pixels[i] >>> 24,
            );
        }
        return out;
    }

    // draw the letters of the snake at their position
    private drawSnake(): void {
        const half = FONT_CHAR_WIDTH >> 1;
        const positions = this.snake_.positions();

        this.snakesfc_.clear();
        for (let i = 0; i < positions.length; i++) {
            const chardata = this.tint(this.fontmap_.getCharPixels(SNAKE_TEXT.charAt(i)));
            const x = Math.floor(positions[i].x) - half;
            const y = Math.floor(positions[i].y) - half;
            // the black background of the letters is transparent (letters may overlap)
            this.snakesfc_.writeBlock(chardata, x, y, FONT_CHAR_WIDTH, FONT_CHAR_HEIGHT, 0xff000000);
        }
    }

    // draw a text scroller in the surface
    private drawText(text: TextScroller): void {
        const cy = this.fontsfc_.height >> 1;
        let x = text.xpos;

        this.fontsfc_.clear();
        for (let i = text.begin; i < text.end; i++) {
            // retrieve the character pixels
            const chardata = this.fontmap_.getCharPixels(text.text.charAt(i));

            // compute the new position
            const y = text.ypos(cy, 40, x, text.value, this.display_.width);

            // copy the character on the font surface
            this.fontsfc_.writeBlock(chardata, x, y, FONT_CHAR_WIDTH, FONT_CHAR_HEIGHT);

            // break the loop before going off screen
            x += FONT_CHAR_WIDTH;
            if (x > text.xmax) break;
        }
    }

    // load the assets
    protected init(): Promise<unknown> {
        return this.sprite_.loadImage("/images/assets/ts-scroller.sprite.png");
    }

    // update the animation
    protected update(): void {
        // draw the text on the font surface
        this.drawText(this.text_);

        // move the snake and draw it
        this.snake_.update();
        this.drawSnake();

        // update the text position
        this.text_.end += 1;
        if (this.text_.end >= this.text_.text.length) this.text_.end = this.text_.text.length;

        this.text_.xpos -= 3;
        if (this.text_.xpos < 0) {
            this.text_.xpos = FONT_CHAR_WIDTH;
            this.text_.begin += 1;

            if (this.text_.begin >= this.text_.end) {
                this.text_.begin = 0;
                this.text_.end = 1;
                this.text_.xpos = this.display_.width + FONT_CHAR_WIDTH;

                this.text_.value += this.text_.incr;
                if (this.text_.value < 0 || this.text_.value > 4) this.text_.incr *= -1;
            }
        }
    }

    // render the animation
    protected render(): void {
        // surface clearing
        this.display_.surface.clear();

        // the snake first, so it goes behind the girl
        this.display_.surface.blend({ x: 0, y: 0 }, this.snakesfc_, undefined, 1.0, 0xff000000);

        // add the background sprite
        this.display_.surface.blend({ x: 0, y: 0 }, this.sprite_);

        // blend the font surface
        this.display_.surface.blend(
            { x: 0, y: this.display_.height >> 1 },
            this.fontsfc_,
            { x: FONT_CHAR_WIDTH, y: 0, w: this.display_.width, h: this.fontsfc_.height },
            1.0,
            0xff000000,
        );

        this.display_.draw();
    }
}
