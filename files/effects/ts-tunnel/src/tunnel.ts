/*
 * @file    tunnel.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Tunnel effect in Typescript
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { Display } from "library/core/display";
import { Surface } from "library/gfx/surface";


//----- globals


//----- class
export class Tunnel extends IAnimation {

    //----- members
    private texture_: Surface;
    // transformation maps (twice the screen size); Float64Array on purpose:
    // the distance at the very center is NaN, which reads the first texel
    private distance_: Float64Array;
    private angle_: Float64Array;
    private shade_: Float64Array;           // shade factor [0..1]


    //----- methods
    // constructor
    constructor(display: Display) {
        super('tunnel', display);

        // set the vars
        this.texture_  = new Surface();
        let size = (display.width << 1) * (display.height << 1);
        this.distance_ = new Float64Array(size);
        this.angle_    = new Float64Array(size);
        this.shade_    = new Float64Array(size);
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
                this.shade_[offset + x] = Math.min(sq, 255) / 255;
            }
        }
    }

    // load the assets
    protected init(): Promise<unknown> {
        return this.texture_
            .loadImage('/images/assets/ts-tunnel.texture.jpg')
            .then(() => {
                // compute the maps
                this.computeMaps();
            });
    }

    // update the animation
    protected update(timestamp: number): void {
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

        const distance = this.distance_;
        const angle = this.angle_;
        const shades = this.shade_;
        const src = this.texture_.data32;
        const dst = this.display_.surface.data32;
        const mw = w << 1;

        // go through all the pixels
        let addr = 0;
        for (let y = 0; y < h; y++) {
            let t_off = (y + cameraY) * mw + cameraX;

            for (let x = 0; x < w; x++, t_off++) {
                // texture coordinates
                let tx = Math.floor(distance[t_off] + effectX) % tw;
                let ty = Math.floor(angle[t_off] + effectY) % th;

                // adjust ty in case it's negative
                while (ty < 0) {
                    ty += th;
                }

                // retrieve texture data (NaN index -> first texel)
                let value = src[((ty * tw + tx) << 2) >> 2];

                // compute the new color with the shade
                let shade = shades[t_off];
                let r = Math.floor((value & 0xff) * shade);
                let g = Math.floor(((value >> 8) & 0xff) * shade);
                let b = Math.floor(((value >> 16) & 0xff) * shade);

                // copy the pixel back to the screen
                dst[addr++] = (value & 0xff000000) | (b << 16) | (g << 8) | r;
            }
        }
    }

    // render the animation on the screen
    protected render(time?: number): void {
        // flip the back-buffer onto the screen
        this.display_.draw();
    }
}