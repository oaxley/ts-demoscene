/*
 * @file    main.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Typescript file for the main page
 */

//----- imports

//----- globals


//----- interfaces
// query results
interface QueryResult {
    ok: boolean,
    json: <T>() => T,
}

// configuration items
interface Config {
    name: string,
    title: string
}

//----- functions


//----- class
class Slider {

    //----- members
    private display_: HTMLCanvasElement;
    private config_: Config[];

    private cImage_: HTMLImageElement;          // current image displayed
    private nImage_: HTMLImageElement;          // next image to display

    private maxImage_: number;                  // max number of images loaded
    private curImage_: number;                  // current image displayed

    //----- methods
    constructor(output: HTMLCanvasElement) {
        // set the vars
        this.display_ = output;
        this.config_ = [];

        // retrieve the configuration from the NodeJS server
        this.request().then((result) => {
            this.config_ = result.json()['effects'];

            // initialize counters
            this.maxImage_ = this.config_.length;
            this.curImage_ = 0;

            // load the first image
            this.loadImage(this.curImage_);
        });
    }

    // parse the result from the Ajax query
    private parseResult(xhr: XMLHttpRequest): QueryResult {
        return {
            ok: (xhr.status >= 200) && (xhr.status < 300),
            json: <T>() => JSON.parse(xhr.responseText) as T
        }
    }

    // Ajax query to retrieve the configuration
    private request(): Promise<QueryResult> {
        return new Promise<QueryResult>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("get", "/config");

            xhr.onload = evt => {
                resolve(this.parseResult(xhr));
            }

            xhr.send();
        });
    }

    // load an image
    private loadImage(index: number): void {
        if ((index < 0) || (index >= this.maxImage_)) {
            console.log(`index (${this.curImage_}) out of boundaries [0, ${this.maxImage_}].`);
            return;
        }

        let name = this.config_[index]['name'] + '.screenshot.png';

        this.nImage_ = new Image();
        this.nImage_.onload = () => {
            console.log(`loading ${name}`);
            this.display_.getContext("2d").drawImage(this.nImage_, 0, 0);
        };
        this.nImage_.src = '/images/' + name;
    }
}

//----- begin
// retrieve the output canvas
let output = <HTMLCanvasElement> document.getElementById("output");

// create a new instance of the slider
let slider = new Slider(output);
