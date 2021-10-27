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
import { Surface } from "library/core/surface";


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
        this.distance_ = [];
        this.angle_    = [];
        this.shade_    = [];
    }

    // compute the transformation maps
    private computeMaps(): void {
        // constants
        const w = this.display_.width;
        const h = this.display_.height;
        const tw = this.texture_.width;
        const th = this.texture_.height;
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

    // texture loader
    private loadTexture(name: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            let img = new Image();
            img.onload = () => {
                resolve(img);
            };
            img.src = name;
        });
    }

    // update the animation
    protected update(timestamp: number): void {
        if (!this.isAnimated)
            return;
    }

    // render the animation on the screen
    protected render(timestamp: number): void {
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
        this.loadTexture('/images/ts-tunnel.asset.jpg').then(img => {

            // create the new surface
            this.texture_ = new Surface({width: img.width, height: img.height});
            this.texture_.context.drawImage(img, 0, 0);
            console.log('Texture loaded.');

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
    public run(time: number | undefined): States {

        // update & render the tunnel effect
        this.update(time);
        this.render(time);

        // this animation will run indefinitely
        return States.S_RUNNING;
    }
}