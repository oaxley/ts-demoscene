/*
 * @file    starfield.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Starfield effect in Typescript
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { States } from "library/core/manager";
import { Display } from "library/core/display";
import { Point3D } from "library/core/interfaces";
import { Palette } from "library/color/palette";
import { Color } from "library/color/color";
import { RGBA } from "library/color/RGBA";


//----- globals
const NUMBER_OF_STARS = 1024;


//----- interface
interface Star {
    position: Point3D
    speed: number
    color: number
}

//----- class
export class Starfield extends IAnimation {

    //----- members
    private stars_: Star[];
    private palette_: Palette;

    //----- methods
    constructor(display: Display) {
        super('starfield', display);

        // set the vars
        this.stars_ = [];
        this.palette_ = new Palette();

        // initialize the stars
        for (let i = 0; i < NUMBER_OF_STARS; i++) {
            this.initStar(i);
        }

        // initialize the palette
        this.createPalette();
    }

    // initialize a star
    private initStar(index: number): void {
        this.stars_[index] = {
            position: {
                x: (-200.0 + (400 * Math.random())),
                y: (-200.0 + (400 * Math.random())),
                z: (-200.0 + (400 * Math.random())),
            },
            speed: 2 + Math.floor(2 * Math.random()),
            color: index % 256
        }
    }

    // palette creation
    private createPalette(): void {
        this.palette_.setColor(0, Color.from(new RGBA(0, 0, 0)));
        for (let i = 0; i < 255; i++) {
            this.palette_.setColor(255 - i, Color.from(new RGBA(i, i, i)));
        }
    }

    // update the animation
    protected update(time?: number): void {
        if (!this.isAnimated) {
            return;
        }

        // move the stars
        for (let i = 0; i < NUMBER_OF_STARS; i++) {
            let star: Star = this.stars_[i];
            star.position.z -= star.speed;
        }
    }

    // render the animation on the screen
    protected render(time?: number): void {
        if (!this.isAnimated) {
            return;
        }

        // image backbuffer
        this.display_.surface.clear();
        let imgdata = this.display_.surface.data;

        // center of the screen
        const w = this.display_.width;
        const h = this.display_.height;
        const cx = w >> 1;
        const cy = h >> 1;

        // compute the 2D position of each stars
        for (let i = 0; i < NUMBER_OF_STARS; i++) {
            // retrieve the data for this star
            let star: Star = this.stars_[i];

            let px: number = cx + Math.floor((star.position.x * 256) / (star.position.z + 384));
            let py: number = cy + Math.floor((star.position.y * 256) / (star.position.z + 384));

            if ((px < 0) || (px > w - 1) || (py < 0) || (py > h - 1)) {
                this.initStar(i);
                continue;
            }

            let rgba = this.palette_.getColor(star.color)!.color.values;

            let addr = ((py * w) + px) << 2;
            imgdata.data[addr + 0] = rgba.x;
            imgdata.data[addr + 1] = rgba.y;
            imgdata.data[addr + 2] = rgba.z;
            imgdata.data[addr + 3] = rgba.a;
        }

        // put back the image data on the backbuffer
        this.display_.surface.data = imgdata;

        // flip the back-buffer onto the screen
        this.display_.clear();
        this.display_.draw();

    }

    // setup function
    public setup(): void {
        // toggle the animation
        this.toggle();

        // set the click handler to pause the animation
        window.onclick = () => {
            this.toggle();
        }

        console.log("Starting Starfield animation.");
    }

    // cleanup function
    public cleanup(): void {
    }

    // run the animation
    public run(time?: number): States {
        // update and render
        this.update(time);
        this.render(time);

        // this animation will run indefinitely
        return States.S_RUNNING;
    }
}