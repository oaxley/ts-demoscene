/*
 * @file    app.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   ExpressJS main application
 */

//----- imports
import express from 'express';
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

// load the JSON configuration
import * as config from "../config/effects.json";


//----- globals
const PORT = 8080;
const HOST = 'localhost';


//----- begin
// ExpressJS instance
var app = express();

// set the view engine
app.set('views', "public/views" );
app.set('view engine', 'pug');

// static pages
app.use(express.static("public"));

// add dynamic effects routes
config['effects'].forEach(effect => {
    app.get("/" + effect['name'], (req: Request, res: Response) => {
        res.render(effect['name'], {
            title: effect['title']
        })
    });
});

// default route
app.get('/', (req: Request, res: Response) => {
    res.render('index', {
        title: "90's Demoscene effects",
    });
});

// retrieve the configuration
app.get('/config', (req: Request, res: Response) => {
    res.send(config)
});

// retrieve a 3D model
app.get('/model/:name', (req: Request, res: Response) => {

    // build the complete filename
    var filename = path.join('public/models/' + req.params.name + '.json');

    // check for exists
    if (fs.existsSync(filename)){
        var data = JSON.parse(fs.readFileSync(filename, 'utf8'));
        res.status(200).send(data);
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
