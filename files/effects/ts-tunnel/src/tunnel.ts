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


    //----- methods
    // constructor
    constructor(display: Display) {
        super('tunnel', display);
    }

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