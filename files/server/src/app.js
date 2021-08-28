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
const PUBLIC_DIR = path.join(__dirname, "../../../public");


//----- begin
// read the configuration file
try {
    const data = fs.readFileSync(path.join(__dirname, '../config/effects.json'), 'utf8');
    var config = JSON.parse(data);
} catch (err) {
    console.log(`An error occured while reading the configuration file: ${err}`);
    process.exit(1);
}

// setup the PUG view configuration
var cfg_views = [ path.join(__dirname, "../views") ];
config['effects'].forEach(effect => {
    cfg_views.push(
        path.join(__dirname, "../../effects", effect['name'], 'views')
    )
});

// ExpressJS instance
var app = express();

// set the view engine
app.set('views', cfg_views);
app.set('view engine', 'pug');

// static pages
app.use(express.static(PUBLIC_DIR));

// default route
app.get('/', (req, res) => {
    res.render('index', {
        title: 'Oldskool demoscene effects'
    });
});

// start the ExpressJS server
app.listen(PORT, () => {
    console.log(`ExpressJS started on http://localhost:${PORT}.`);
});