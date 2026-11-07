/*
 * @file    main.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Typescript file for the main page (effects slider)
 */

//----- imports
import { Config, Effect } from "./types";

//----- class
class Slider {
    //----- members
    private display_: HTMLCanvasElement; // the display canvas
    private prev_: HTMLElement; // previous button
    private next_: HTMLElement; // next button

    private effects_: Array<[string, Effect]>; // effects from the configuration (name, effect)
    private current_: number; // current effect displayed

    private image_: HTMLImageElement; // screenshot being loaded

    //----- methods
    constructor(output: HTMLCanvasElement, prev: HTMLElement, next: HTMLElement) {
        // set the vars
        this.display_ = output;
        this.prev_ = prev;
        this.next_ = next;
        this.effects_ = [];
        this.current_ = 0;
        this.image_ = new Image();

        // add handlers to the buttons
        prev.addEventListener("click", () => this.show(this.current_ - 1));
        next.addEventListener("click", () => this.show(this.current_ + 1));
        this.updateButtons();
    }

    // retrieve the configuration from the NodeJS server and show the first effect
    public async load(): Promise<void> {
        const response = await fetch("/config");
        if (!response.ok) {
            throw new Error(`Unable to retrieve the configuration (${response.status}).`);
        }

        const config: Config = await response.json();
        this.effects_ = Object.entries(config);
        this.show(this.startIndex());
    }

    // index of the effect named in the URL hash (e.g. "/#ts-plasma"), first effect otherwise
    private startIndex(): number {
        let wanted: string;
        try {
            wanted = decodeURIComponent(location.hash.slice(1));
        } catch {
            return 0; // malformed percent-encoding
        }

        const index = this.effects_.findIndex(([name]) => name === wanted);
        return index < 0 ? 0 : index;
    }

    // show an effect (screenshot and credits)
    private show(index: number): void {
        if (index < 0 || index >= this.effects_.length) {
            return;
        }

        this.current_ = index;
        const [name, effect] = this.effects_[index];

        this.loadImage(name);
        this.loadCredits(name, effect);
        this.updateButtons();
    }

    // enable / disable the buttons
    private updateButtons(): void {
        this.prev_.classList.toggle("inactive", this.current_ <= 0);
        this.next_.classList.toggle("inactive", this.current_ >= this.effects_.length - 1);
    }

    // load the effect screenshot
    private loadImage(name: string): void {
        const image = new Image();
        image.onload = () => {
            // ignore a screenshot arriving after a newer one was requested
            if (image === this.image_) {
                this.display_.getContext("2d")!.drawImage(image, 0, 0);
            }
        };
        image.src = `/images/screenshot/${name}.png`;
        this.image_ = image;
    }

    // set the name and description for the effect
    private loadCredits(name: string, effect: Effect): void {
        const link = document.createElement("a");
        link.href = `/effect/${name}`;
        link.textContent = `\u276F\u276F ${effect.title}`;

        document.getElementById("effect-name")!.replaceChildren(link);
        document.getElementById("effect-desc")!.textContent = effect.description;
    }
}

//----- begin
// retrieve the elements from the page
const output = document.getElementById("output") as HTMLCanvasElement;
const prev = document.getElementById("prev")!;
const next = document.getElementById("next")!;

// create a new instance of the slider
new Slider(output, prev, next).load().catch((error) => console.error(error));
