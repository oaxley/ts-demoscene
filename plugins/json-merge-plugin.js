const fs = require("fs");
const path = require("path");


class JSONMergePlugin {
    constructor(options = {}) {
        this.options = options;
    }

    apply(compiler) {
        var config = {
            "effects": []
        }

        // read all the JSON configuration files
        for (var elt in this.options.files) {
            // retrieve the filename
            let filename = this.options.files[elt].from;

            // logging
            console.log(`JSONMergePlugin: Adding JSON config ${filename}`);

            // read the JSON data
            let content = fs.readFileSync(filename, 'utf8');
            let data = JSON.parse(content);

            // add the data to the global configuration item
            config['effects'].push(data);
        };

        // create the output directory
        const dir  = path.dirname(this.options.output);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true});
        }

        // save the output file
        let filename = path.relative(".", this.options.output);
        console.log(`JSONMergePlugin: Writing JSON ${filename}`);
        fs.writeFileSync(filename, JSON.stringify(config, null, 4), 'utf-8');
    }
}

module.exports = JSONMergePlugin;