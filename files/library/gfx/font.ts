/*
 * @file    font.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Font management class
 */

//----- imports
import { Size } from "library/core/interfaces";
import { Surface } from "library/gfx/surface";

//----- class
export class Font {
    //----- members
    private font_: Surface;
    private unit_: Size;
    private chars_: Map<string, Uint32Array>; // cached character pixels

    //----- methods
    constructor(filename: string, unit: Size) {
        // setup the vars
        this.font_ = new Surface();
        this.unit_ = unit;
        this.chars_ = new Map();

        // load the font
        console.log("Loading font ...");
        this.font_
            .loadImage(filename)
            .then(() => {
                console.log("Font: asset properly loaded");
            })
            .catch(() => {
                console.log(`Font: unable to load asset ${filename}`);
            });
    }

    // return the current size unit for this font
    public get unit(): Size {
        return this.unit_;
    }

    /* return the pixels of a single character (unit.width * unit.height values)
     *
     * The returned array is cached and shared: it must not be modified.
     */
    public getCharPixels(char: string): Uint32Array {
        let pixels = this.chars_.get(char);
        if (pixels === undefined) {
            const code = char.charCodeAt(0) - 32;
            const x = (code % 16) * this.unit_.width;
            const y = (code >> 4) * this.unit_.height;

            pixels = new Uint32Array(this.unit_.width * this.unit_.height);

            // blank character until the font is loaded (not cached)
            if (this.font_.width > 0) {
                this.font_.readBlock(x, y, this.unit_.width, this.unit_.height, pixels);
                this.chars_.set(char, pixels);
            }
        }
        return pixels;
    }

    // return the image data for a single character
    public getCharData(char: string): ImageData {
        // retrieve the ASCII value
        const code = char.charCodeAt(0) - 32;

        // compute the position of the character in the map
        const x = (code % 16) * this.unit_.width;
        const y = (code >> 4) * this.unit_.height;

        // return the imagedata
        return this.font_.getImgBlock(x, y, this.unit_.width, this.unit_.height);
    }
}
