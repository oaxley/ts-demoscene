/*
 * @file    server.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   ExpressJS routes (needs the generated public/ directory)
 *
 *          Skipped when the project has not been built (npm run build).
 */

//----- imports
import fs from "fs";
import path from "path";
import type { AddressInfo } from "net";
import type { Server } from "http";
import { describe, test, expect, beforeAll, afterAll } from "vitest";

import { createApp } from "../files/server/src/server";
import type { Config } from "../files/server/src/types";

//----- globals
const ROOT = path.resolve(import.meta.dirname, "../public");
const CONFIG_FILE = path.join(ROOT, "json/config.json");
const built = fs.existsSync(CONFIG_FILE) && fs.existsSync(path.join(ROOT, "views/layout.pug"));

//----- tests
describe.skipIf(!built)("server routes", () => {
    let server: Server;
    let base: string;
    let config: Config;

    beforeAll(async () => {
        config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
        server = createApp(config, ROOT).listen(0, "127.0.0.1");
        await new Promise((resolve) => server.once("listening", resolve));
        base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });

    afterAll(() => {
        server?.close();
    });

    test("index page", async () => {
        const res = await fetch(`${base}/`);
        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain("/css/common.css");
        expect(html).toContain("/js/main.bundle.js");
        expect(html).toContain('id="prev"');
    });

    test("configuration", async () => {
        const res = await fetch(`${base}/config`);
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual(config);
    });

    test("every effect page renders with its bundle", async () => {
        for (const [name, effect] of Object.entries(config)) {
            const res = await fetch(`${base}/effect/${name}`);
            expect(res.status, name).toBe(200);
            const html = await res.text();
            expect(html).toContain(`/js/${name}.bundle.js`);
            expect(html).toContain(effect.title.replace(/'/g, "&#39;").replace(/&(?!#)/g, "&amp;"));
            if (effect.artist) expect(html).toContain(effect.artist.link);
        }
    });

    test("unknown effect / page: 404", async () => {
        for (const url of ["/effect/nope", "/effect/toString", "/nope"]) {
            const res = await fetch(`${base}${url}`);
            expect(res.status, url).toBe(404);
            expect(await res.text()).toContain("does not exist");
        }
    });
});
