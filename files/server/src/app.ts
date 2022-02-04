/*
 * @file    app.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   ExpressJS main application
 */

//----- imports
import fs from 'fs';
import path from 'path';
import express from 'express';
import { Request, Response } from 'express';


//----- globals
const PORT = 8080;
const HOST = 'localhost';


//----- interfaces
interface Link {
    link: string,
    name: string
}

interface Effect {
    title: string,
    description: string,
    artist?: Link,
    website?: Link
}

interface DataEffect {
    [key: string]: any
}


//----- begin
// read the configuration
const data = fs.readFileSync("public/json/config.json", 'utf-8');
let config: Record<string, Effect> = JSON.parse(data);

// ExpressJS instance
var app = express();

// set the view engine
app.set('views', 'public/views');
app.set('view engine', 'pug');

// static pages
app.use(express.static("public"));

// default route
app.get('/', (req: Request, res: Response) => {
    res.render('index', {
        title: "90's Demoscene effects",
    })
});

// retrieve the configuration
app.get('/config', (req: Request, res: Response) => {
    res.send(config);
});

// open a new effect page
app.get('/effect/:name', (req: Request, res: Response) => {
    let name = req.params.name;
    if (name in config) {
        // prepare the data for the effect
        let data: DataEffect = {
            title: config[name].title,
            bundle: '/js/' + name + '.bundle.js',
        };

        // add artist information
        if ("artist" in config[name]) {
            data.artist = config[name].artist;
        }

        // add website information
        if ("website" in config[name]) {
            data.website = config[name].website;
        }

        res.render('effect', data);
    } else {
        res.status(404).send();
    }
});

// retrieve the parameters from the environment
let host: string = (process.env.HOST === undefined) ? HOST : process.env.HOST;
let port: number = (process.env.PORT === undefined) ? PORT : parseInt(process.env.PORT);

// start the ExpressJS server
app.listen(port, host, () => {
    console.log(`ExpressJS started on http://${host}:${port}.`);
});
