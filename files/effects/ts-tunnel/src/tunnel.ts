/*
 * @file    tunnel.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Tunnel effect in Typescript
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { States } from "library/core/manager";
import { Display } from "library/core/display";
import { Surface } from "library/gfx/surface";
import { RGBA } from "library/color/RGBA";


//----- globals


//----- class
export class Tunnel extends IAnimation {

    //----- members
    private texture_: Surface;
    private distance_: number[];
    private angle_: number[];
    private shade_: number[];


    //----- methods
    // constructor
    constructor(display: Display) {
        super('tunnel', display);

        // set the vars
        this.texture_  = new Surface();
        this.distance_ = [];
        this.angle_    = [];
        this.shade_    = [];
    }

    // compute the transformation maps
    private computeMaps(): void {
        // constants
        const w = this.display_.width;
        const h = this.display_.height;
        const tw = this.texture_!.width;
        const th = this.texture_!.height;
        const ratio = 32.0;

        // the maps are twice as big as the screen to be able to move inside it
        for (let y = 0; y < h << 1; y++) {
            let offset = y * (w << 1);
            let dy  = y - h;
            let dy2 = dy * dy;
            for (let x = 0; x < (w << 1); x++) {
                let dx  = x - w;
                let dx2 = dx * dx;

                // compute the values
                let sq = Math.sqrt(dx2 + dy2);
                let a  = Math.floor(1.0 * tw * Math.atan2(dy, dx) / Math.PI);
                let d  = Math.floor(ratio * th / sq) % th;

                // set the maps
                this.distance_[offset + x] = d;
                this.angle_[offset + x] = a;
                this.shade_[offset + x] = Math.min(sq, 255);
            }
        }
    }

    // update the animation
    protected update(timestamp: number): void {
        if (!this.isAnimated)
            return;

        // constants
        const tw = this.texture_!.width;
        const th = this.texture_!.height;
        const w = this.display_.width;
        const h = this.display_.height;

        const time = timestamp / 1000;

        // compute the effect
        let effectX = Math.floor(tw * 1.00 * time);
        let effectY = Math.floor(th * 0.25 * time);

        // camera movement effect
        let cameraX = (w >> 1) + Math.floor((w >> 2) * Math.sin(time));
        let cameraY = (h >> 1) + Math.floor((h >> 2) * Math.sin(time * 2.0));

        // go through all the pixels
        this.display_.surface.address = 0;
        for (let y = 0; y < h; y++) {

            for (let x = 0; x < w; x++) {
                // texture offset
                let t_off = (y + cameraY) * (w << 1) + (x + cameraX)

                // texture coordinates
                let tx = Math.floor(this.distance_[t_off] + effectX) % tw;
                let ty = Math.floor(this.angle_[t_off] + effectY) % th;

                // adjust ty in case it's negative
                while (ty < 0) {
                    ty += th;
                }

                // shade value
                let shade = this.shade_[t_off] / 255;

                // retrieve texture data
                this.texture_.address = ty * tw + tx;
                let value = this.texture_.streamW;

                // compute the new color with the shade
                let [r, g, b, a] = RGBA.fromUInt32(value);
                r = Math.floor(r * shade);
                g = Math.floor(g * shade);
                b = Math.floor(b * shade);
                value = RGBA.toUInt32(r, g, b, a);

                // copy the pixel back to the screen
                this.display_.surface.streamW = value;
            }
        }
    }

    // render the animation on the screen
    protected render(time?: number): void {
        if (!this.isAnimated)
            return;

        // flip the back-buffer onto the screen
        this.display_.draw();

        // increment the number of frames
        this.frames_++;
    }

    // setup function
    public setup(): void {
        // load the texture
        this.texture_
            .loadImage('/images/assets/ts-tunnel.texture.jpg')
            .then((result) => {
                // compute the maps
                this.computeMaps();

                // toggle the animation
                this.toggle();

                // set the click handler to pause the animation
                window.onclick = () => {
                    this.toggle();
                }

                console.log("Starting the Tunnel animation.");
            });
    }

    // cleanup function
    public cleanup(): void {
    }

    // run the animation
    public run(time: number): States {

        // update & render the tunnel effect
        this.update(time);
        this.render(time);

        // this animation will run indefinitely
        return States.S_RUNNING;
    }
}