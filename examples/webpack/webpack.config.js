const webpack = require('webpack');
module.exports = [
    {
        entry: "./src/index.ts",
        output: {
            filename: "bundle.js",
            publicPath: "/dist/"
        },
        resolve: {
            // Add `.ts` and `.tsx` as a resolvable extension.
            extensions: [".ts", ".tsx", ".js"]
        },
        devtool: 'source-map',
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    loader: "ts-loader"
                },
            ],
        },
        mode: 'production'
    },
    {
        entry: {
            'parent.worker': './src/parent.worker.ts',
            'child.worker': './src/child.worker.ts',
        },
        output: {
            filename: "[name].js",
            publicPath: "/dist/"
        },
        resolve: {
            // Add `.ts` and `.tsx` as a resolvable extension.
            extensions: [".ts", ".tsx", ".js"]
        },
        devtool: 'source-map',
        target: 'webworker',
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    loader: "ts-loader"
                },
            ],
        },
        mode: 'production'
    },
    {
        entry: {
            'amjs': '../../',
        },
        output: {
            filename: "[name].js",
            library: "amjs",
            libraryTarget: "umd",
            publicPath: "/dist/"
        },
        resolve: {
            // Add `.ts` and `.tsx` as a resolvable extension.
            extensions: [".ts", ".tsx", ".js"]
        },
        devtool: 'source-map',
        target: 'webworker',
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    loader: "ts-loader"
                },
            ],
        },
        mode: 'production'
    },
];
