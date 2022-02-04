
//----- imports
const CopyPlugin = require("copy-webpack-plugin");
const NodeExternals = require("webpack-node-externals");
const path = require("path");
const glob = require("glob");
const JSONMergePlugin = require("./plugins/json-merge-plugin");


//----- globals
const PUBLIC_DIR = path.join(__dirname, "public");


//----- functions

// find all the images in the directory structure
function findImages() {
    let images = [];
    let rootdir = path.join(__dirname, "files");

    let files = glob.sync(`${rootdir}{/**/*.png,/**/*.jpg}`);

    if (files.length > 0) {
        files.forEach(file => {
            let filename = path.basename(file);
            let dirs = path.dirname(file).split(path.sep);
            let output = PUBLIC_DIR + '/images';

            if (filename == "screenshot.png") {
                // rename screenshots on the fly
                let dirname = dirs[dirs.length - 1];
                output += '/screenshot/' + dirname + '.png';
            } else {
                // prefix assets with their effect name
                let effect = dirs[dirs.length - 2];
                output += '/assets/' + effect + '.' + filename;
            }

            // add the image to the list
            images.push({
                from: file,
                to: output
             });
        });
    }

    return images
}

// generic file finder for copy plugin
function findFiles(pattern, outputDir) {
    let output = [];
    let rootdir = path.join(__dirname, "files");

    // retrieve the list of files
    let files = glob.sync(`${rootdir}/**/${pattern}`);

    // add the files to the array for CopyPlugin
    if (files.length > 0) {
        files.forEach(file => {
            output.push({
                from: path.relative(".", file),
                to: outputDir
            });
        });
    }

    return output;
}

// find all the entry-points
function findEntryPoints() {
    let entry_points = {
        express: path.join(__dirname, "files/server/src/app.ts"),
        main: path.join(__dirname, "files/server/src/main.ts")
    };
    let rootdir = path.join(__dirname, "files/effects");

    let files = glob.sync(`${rootdir}/**/main.ts`);

    if (files.length > 0) {
        files.forEach(file => {
            // retrieve the directory
            let dirs = path.dirname(file).split('/');
            let name = dirs[dirs.length - 2];

            entry_points[name] = file;
        });
    }

    return entry_points;
}


//----- begin
// find files for the CopyPlugins
let copy_plugin_pattern = [].concat(findImages())
                            .concat(findFiles("*.css", `${PUBLIC_DIR}/css`))
                            .concat(findFiles("*.pug", `${PUBLIC_DIR}/views`))
                            .concat(findFiles("models/*.json", `${PUBLIC_DIR}/json`));


// find all the entry-points
let entry_points = findEntryPoints();

//----- webpack config
module.exports = {
    // entry point
    entry: entry_points,

    // output point
    output: {
        path: PUBLIC_DIR + "/js",
        filename: '[name].bundle.js',
        clean: true
    },

    // plugins
    plugins: [
        new CopyPlugin({patterns: copy_plugin_pattern}),
        new JSONMergePlugin({
            files: findFiles("config.json", ""),
            output: `${PUBLIC_DIR}/json/config.json`
        })
    ],

    // module rules
    module: {
        rules: [
            // typescript compilation
            {
                test: /\.ts$/i,
                use: [ "ts-loader" ],
            },
        ]
    },
    resolve: {
        modules: [
            path.resolve('./files/')
        ],
        extensions: ['.ts', '.js'],
    },
    externals: [ NodeExternals() ]
};