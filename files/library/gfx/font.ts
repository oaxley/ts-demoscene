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

    //----- methods
    constructor(filename: string, unit: Size) {
        // setup the vars
        this.font_ = new Surface();
        this.unit_ = unit;

        // load the font
        console.log("Loading font ...");
        this.font_
            .loadImage(filename)
            .then(result => {
                console.log('Font: asset properly loaded');
            })
            .catch(result => {
                console.log(`Font: unable to load asset ${filename}`);
            });
    }

    // return the current size unit for this font
    public get unit(): Size {
        return this.unit_;
    }

    // return the image data for a single character
    public getCharData(char: string): ImageData {
        // retrieve the ASCII value
        let code = char.charCodeAt(0) - 32;

        // compute the position of the character in the map
        let x = (code % 16) * this.unit_.width;
        let y = (code >> 4) * this.unit_.height;

        // return the imagedata
        return this.font_.getImgBlock(x, y, this.unit_.width, this.unit_.height);
    }
}