/*
 * @file    server.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   ExpressJS application (routes)
 */

//----- imports
import express from "express";
import { Request, Response, NextFunction, Express } from "express";

import { Config } from "./types";

//----- functions
/* create the ExpressJS application
 *
 * Args:
 *      config  : the effects configuration
 *      root    : directory with the generated files (public/)
 */
export function createApp(config: Config, root: string = "public"): Express {
    const app = express();

    // set the view engine
    app.set("views", `${root}/views`);
    app.set("view engine", "pug");

    // static pages
    app.use(express.static(root));

    // default route
    app.get("/", (_req: Request, res: Response) => {
        res.render("index", {
            title: "90's Demoscene effects",
        });
    });

    // retrieve the configuration
    app.get("/config", (_req: Request, res: Response) => {
        res.json(config);
    });

    // open a new effect page
    app.get("/effect/:name", (req: Request, res: Response, next: NextFunction) => {
        const name = req.params.name;
        if (!Object.hasOwn(config, name)) {
            return next();
        }

        const effect = config[name];
        res.render("effect", {
            title: effect.title,
            name,
            bundle: `/js/${name}.bundle.js`,
            artist: effect.artist,
            website: effect.website,
        });
    });

    // everything else
    app.use((_req: Request, res: Response) => {
        res.status(404).render("404", { title: "Effect not found" });
    });

    return app;
}
