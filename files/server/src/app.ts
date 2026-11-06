/*
 * @file    app.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   ExpressJS main application
 */

//----- imports
import fs from "fs";

import { createApp } from "./server";
import { Config } from "./types";

//----- globals
const PORT = 8080;
const HOST = "localhost";

//----- begin
// read the configuration
const config: Config = JSON.parse(fs.readFileSync("public/json/config.json", "utf-8"));

// retrieve the parameters from the environment
const host = process.env.HOST ?? HOST;
const port = (process.env.PORT === undefined) ? PORT : parseInt(process.env.PORT);

// start the ExpressJS server
createApp(config).listen(port, host, () => {
    console.log(`ExpressJS started on http://${host}:${port}.`);
});
