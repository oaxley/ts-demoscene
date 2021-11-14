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
import { Point2D, Point3D } from "library/core/interfaces";
import { Palette } from "library/color/palette";
import { Color } from "library/color/color";
import { RGBA } from "library/color/RGBA";


//----- globals
const NUMBER_OF_STARS = 2048;


//----- interface
interface Star {
    position: Point3D
    speed: number
    color: number
    old_z: number
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
        let z = (-200.0 + (400 * Math.random()));
        this.stars_[index] = {
            position: {
                x: (-200.0 + (400 * Math.random())),
                y: (-200.0 + (400 * Math.random())),
                z: z,
            },
            speed: 2 + Math.floor(2 * Math.random()),
            color: index % 256,
            old_z: z
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
            star.old_z = star.position.z;
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

            let ox: number = cx + Math.floor((star.position.x * 256) / (star.old_z + 384));
            let oy: number = cy + Math.floor((star.position.y * 256) / (star.old_z + 384));

            if ((px < 0) || (px > w - 1) || (py < 0) || (py > h - 1)) {
                this.initStar(i);
                continue;
            }

            let c = this.palette_.getColor(star.color)!
            this.line(imgdata, {x: ox, y: oy}, {x:px, y:py}, c);
        }

        // put back the image data on the backbuffer
        this.display_.surface.data = imgdata;

        // flip the back-buffer onto the screen
        this.display_.clear();
        this.display_.draw();
    }

    private putpixel(imgdata: ImageData, p: Point2D, c: Color): void {
        let rgba = c.color.values;
        let addr = ((p.y * this.display_.width) + p.x) << 2;
        imgdata.data[addr + 0] = rgba.x;
        imgdata.data[addr + 1] = rgba.y;
        imgdata.data[addr + 2] = rgba.z;
        imgdata.data[addr + 3] = rgba.a;
    }

    // trace a line in the flame buffer with the Bresenham algorithm
    private line(imgdata: ImageData, p1: Point2D, p2: Point2D, c: Color): void {
        let incrx: number, incry: number, x: number, y: number;
        let delta: number, dx: number, dy: number;

        [ incrx, incry, x, y ] = [ 1, 1, p1.x, p1.y];
        this.putpixel(imgdata, {x: x, y: y}, c);

        if ( p1.x > p2.x )
            incrx = -1;
        if ( p1.y > p2.y )
            incry = -1;

        dx = Math.abs(p1.x - p2.x);
        dy = Math.abs(p1.y - p2.y);

        if ( dx > dy ) {
            delta = dx / 2;
            for (let i = 1; i <= dx; i++) {
                x += incrx;
                delta += dy;
                if ( delta >= dx ) {
                    delta -= dx;
                    y += incry;
                }
                this.putpixel(imgdata, {x: x, y: y}, c);
            }
        }
        else {
            delta = dy / 2;
            for (let i = 1; i <= dy; i++) {
                y += incry;
                delta += dx;
                if ( delta >= dy ) {
                    delta -= dy;
                    x += incrx;
                }
                this.putpixel(imgdata, {x: x, y: y}, c);
            }
        }
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