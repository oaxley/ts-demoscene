/*
 * @file    app.js
 * @author  Sebastien LEGRAND
 *
 * @brief   ExpressJS main application
 */

//----- imports
const path = require('path');
const express = require('express');
const fs = require('fs');


//----- globals
const PORT=8080;
const HOST="localhost";
const PUBLIC_DIR = path.join(__dirname, "../../../public");
const EFFECTS_DIR = path.join(__dirname, "../../effects");


//----- begin
// read the configuration file
try {
    const data = fs.readFileSync(path.join(__dirname, '../config/effects.json'), 'utf8');
    var config = JSON.parse(data);
} catch (err) {
    console.log(`An error occured while reading the configuration file: ${err}`);
    process.exit(1);
}

// ExpressJS configuration arrays
var cfg_views = [ path.join(__dirname, "../views") ];
var cfg_routes = [];

// go through all the effects and set the configuration arrays
config['effects'].forEach(effect => {

    // PUG views
    cfg_views.push(
        path.join(EFFECTS_DIR, effect['name'], 'views')
    )

    // ExpressJS dynamic routes
    cfg_routes.push({
        name: effect['name'],
        endpoint: "/" + effect['name'],
        title: effect['title'],
    })
});


// ExpressJS instance
var app = express();

// set the view engine
app.set('views', cfg_views);
app.set('view engine', 'pug');

// static pages
app.use(express.static(PUBLIC_DIR));

// add effects routes
cfg_routes.forEach(data => {
    app.get(data['endpoint'], (req, res) => {
        res.render(data['name'], {
            title: data['title']
        });
    });
});

// default route
app.get('/', (req, res) => {
    res.render('index', {
        title: "90's Demoscene effects",
    });
});

// retrieve the configuration
app.get('/config', (req, res) => {
    res.send(config)
});

// start the ExpressJS server
let host = (process.env.HOST === undefined) ? HOST : process.env.HOST;
let port = (process.env.PORT === undefined) ? PORT : process.env.PORT;

app.listen(port, host, () => {
    console.log(`ExpressJS started on http://${host}:${port}.`);
});