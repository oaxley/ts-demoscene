/*
 * @file    build.mjs
 * @author  Sebastien LEGRAND
 *
 * @brief   Build script (esbuild)
 *
 * Usage:
 *      node scripts/build.mjs [--prod] [--watch [--serve]]
 *
 *      --prod  : minified bundles, no source maps
 *      --watch : rebuild bundles and re-copy static files on change
 *      --serve : (with --watch) run the ExpressJS server, restart it when rebuilt
 *
 * Output (public/):
 *      js/express.bundle.js            ExpressJS server (node)
 *      js/main.bundle.js               main page slider (browser)
 *      js/<effect>.bundle.js           one bundle per effect (browser)
 *      images/screenshot/<effect>.png  effect screenshots
 *      images/assets/<dir>.<file>      effect/server assets
 *      css/*.css, views/*.pug          styles and templates
 *      json/config.json                merged effects configuration
 */

//----- imports
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import * as esbuild from "esbuild";

//----- globals
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILES_DIR = path.join(ROOT, "files");
const EFFECTS_DIR = path.join(FILES_DIR, "effects");
const PUBLIC_DIR = path.join(ROOT, "public");

const PROD = process.argv.includes("--prod");
const WATCH = process.argv.includes("--watch");
const SERVE = WATCH && process.argv.includes("--serve");

//----- functions

// list all the effect directories (ts-xxx/src/main.ts)
function findEffects() {
    return fs
        .readdirSync(EFFECTS_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory() && fs.existsSync(path.join(EFFECTS_DIR, d.name, "src/main.ts")))
        .map((d) => d.name)
        .sort();
}

// recursively list files below a directory matching a predicate
function walk(dir, predicate, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(full, predicate, out);
        } else if (predicate(full)) {
            out.push(full);
        }
    }
    return out;
}

// copy a file, creating the destination directory
function copy(from, to) {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
}

// copy the images:
//  - screenshot.png         -> images/screenshot/<parent dir>.png
//  - <dir>/assets/<file>    -> images/assets/<dir>.<file>
function copyImages() {
    const images = walk(FILES_DIR, (f) => /\.(png|jpe?g)$/i.test(f));
    for (const file of images) {
        const name = path.basename(file);
        const dirs = path.dirname(file).split(path.sep);

        let output;
        if (name === "screenshot.png") {
            output = path.join(PUBLIC_DIR, "images/screenshot", dirs[dirs.length - 1] + ".png");
        } else {
            output = path.join(PUBLIC_DIR, "images/assets", dirs[dirs.length - 2] + "." + name);
        }
        copy(file, output);
    }
    return images.length;
}

// copy all the files with a given extension in a flat output directory
function copyFlat(ext, outdir) {
    const files = walk(FILES_DIR, (f) => f.endsWith(ext));
    for (const file of files) {
        copy(file, path.join(PUBLIC_DIR, outdir, path.basename(file)));
    }
    return files.length;
}

// merge all the effects config.json files
function mergeConfig(effects) {
    const config = {};
    for (const name of effects) {
        const file = path.join(EFFECTS_DIR, name, "config.json");
        if (fs.existsSync(file)) {
            Object.assign(config, JSON.parse(fs.readFileSync(file, "utf-8")));
        }
    }

    const output = path.join(PUBLIC_DIR, "json/config.json");
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(config, null, 4), "utf-8");
    return Object.keys(config).length;
}

// copy every static file
function copyStatic(effects) {
    const images = copyImages();
    const css = copyFlat(".css", "css");
    const views = copyFlat(".pug", "views");
    const config = mergeConfig(effects);
    console.log(`static: ${images} images, ${css} css, ${views} views, ${config} effects in config.json`);
}

// esbuild plugin to log rebuilds (and run a callback on success)
function logger(label, onSuccess) {
    return {
        name: "logger",
        setup(build) {
            build.onEnd((result) => {
                const status = result.errors.length ? `failed (${result.errors.length} errors)` : "ok";
                console.log(`${label}: build ${status}`);
                if (!result.errors.length && onSuccess) {
                    onSuccess();
                }
            });
        },
    };
}

// (re)start the ExpressJS server
let serverProcess;
function restartServer() {
    if (serverProcess) {
        serverProcess.kill();
    }
    serverProcess = spawn(process.execPath, [path.join(PUBLIC_DIR, "js/express.bundle.js")], {
        cwd: ROOT,
        stdio: "inherit",
    });
}

//----- begin
const effects = findEffects();

// clean the output directory
fs.rmSync(PUBLIC_DIR, { recursive: true, force: true });

// common esbuild options
const common = {
    bundle: true,
    minify: PROD,
    sourcemap: PROD ? false : "linked",
    target: "es2022",
    logLevel: "warning",
    alias: { library: path.join(FILES_DIR, "library") },
};

// browser bundles (main page + effects)
const webEntries = { "main.bundle": path.join(FILES_DIR, "server/src/main.ts") };
for (const name of effects) {
    webEntries[`${name}.bundle`] = path.join(EFFECTS_DIR, name, "src/main.ts");
}

const web = {
    ...common,
    entryPoints: webEntries,
    outdir: path.join(PUBLIC_DIR, "js"),
    platform: "browser",
    format: "iife",
    plugins: [logger("web")],
};

// node bundle (ExpressJS server)
const server = {
    ...common,
    entryPoints: { "express.bundle": path.join(FILES_DIR, "server/src/app.ts") },
    outdir: path.join(PUBLIC_DIR, "js"),
    platform: "node",
    format: "cjs",
    packages: "external",
    plugins: [logger("server", SERVE ? restartServer : undefined)],
};

copyStatic(effects);

if (WATCH) {
    const contexts = await Promise.all([esbuild.context(web), esbuild.context(server)]);
    await Promise.all(contexts.map((ctx) => ctx.watch()));

    // re-copy the static files when they change
    let timer;
    fs.watch(FILES_DIR, { recursive: true }, (event, filename) => {
        if (!filename || filename.endsWith(".ts")) {
            return;
        }
        clearTimeout(timer);
        timer = setTimeout(() => copyStatic(effects), 100);
    });

    // stop the server with the watcher
    process.on("SIGINT", () => {
        serverProcess?.kill();
        process.exit(0);
    });
    process.on("SIGTERM", () => {
        serverProcess?.kill();
        process.exit(0);
    });

    console.log("watching for changes...");
} else {
    await Promise.all([esbuild.build(web), esbuild.build(server)]);
    console.log(`built ${effects.length} effects (${PROD ? "production" : "development"})`);
}
