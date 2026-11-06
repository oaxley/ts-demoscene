/*
 * @file    types.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Types shared by the ExpressJS server and the main page
 */

//----- interfaces
// a link to an external resource
export interface Link {
    link: string;
    name: string;
}

// an effect entry from the configuration (public/json/config.json)
export interface Effect {
    title: string;
    description: string;
    artist?: Link;
    website?: Link;
}

// the whole configuration: effect name -> effect
export type Config = Record<string, Effect>;
