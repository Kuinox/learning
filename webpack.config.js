const path = require('path');
// creates index.html file by a template index.ejs

module.exports = {
    mode: 'development',
    entry: './interaction/interactions.ts',
    output: {
        library:"TP",
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist')
        // globalObject: 'window',
    },
    optimization: {
        // We no not want to minimize our code.
        minimize: false
    },
    module: {
        rules: [
            {   
                exclude : /node_modules/,
                loader: 'ts-loader'
            }
        ]
    }
};