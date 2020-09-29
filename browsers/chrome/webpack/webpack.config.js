const path = require("path");
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyPlugin = require("copy-webpack-plugin");

const rootDir = path.resolve(__dirname, "../../../");
const chromeRoot = path.resolve(__dirname, "../");

// https://github.com/TypeStrong/ts-loader/blob/master/examples/react-babel-karma-gulp/webpack.config.base.js#L10
const babelLoader = {
  loader: "babel-loader",
  options: {
    presets: [
      "@babel/preset-env",
      "@babel/preset-react",
      "@babel/preset-typescript",
    ],
    plugins: ["@babel/plugin-proposal-class-properties"],
  },
};

module.exports = {
  context: rootDir,
  entry: {
    background: path.resolve(rootDir, "src/background"),
    contentScript: path.resolve(rootDir, "src/contentScript"),
    // the script that gets injected into the host page
    script: path.resolve(rootDir, "src/script"),
    frame: path.resolve(rootDir, "src/frame"),
    options: path.resolve(rootDir, "src/options"),
  },
  output: {
    path: path.resolve(chromeRoot, "bundles"),
  },
  node: {
    fs: "empty",
  },
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
      "@img": path.resolve(rootDir, "img"),
      "@contrib": path.resolve(rootDir, "contrib"),
      "@schemas": path.resolve(rootDir, "schemas"),
      vendors: path.resolve(rootDir, "src/vendors"),
    },
    extensions: [".ts", ".tsx", ".jsx", ".js"],
  },
  plugins: [
    // https://webpack.github.io/docs/list-of-plugins.html#provideplugin
    new webpack.ProvidePlugin({
      $: "jquery",
      jQuery: "jquery",
    }),
    new CopyPlugin({
      patterns: [{ from: path.resolve(chromeRoot, "src") }],
    }),
    new MiniCssExtractPlugin(),
  ],
  module: {
    rules: [
      {
        test: /\.s?css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              // you can specify a publicPath here
              // by default it uses publicPath in webpackOptions.output
              publicPath: "../",
              hmr: process.env.NODE_ENV === "development",
            },
          },
          "css-loader",
          { loader: "sass-loader", options: { sourceMap: true } },
        ],
      },
      {
        test: /\.tsx?$/,
        use: [
          babelLoader,
          { loader: "ts-loader?configFile=tsconfig.webpack.json" },
        ],
        exclude: /(node_modules|bower_components)/,
      },
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: [babelLoader],
      },
      {
        test: /\.(svg|png|jpg|gif)?$/,
        exclude: /(bootstrap-icons|simple-icons)/,
        use: [
          {
            loader: "file-loader",
            options: {
              emitFile: true,
              outputPath: "img",
            },
          },
        ],
      },
      {
        test: /(bootstrap-icons|simple-icons).*\.svg$/,
        loader: "svg-inline-loader",
      },
      {
        test: /\.(woff(2)?|ttf|eot)(\?v=\d+\.\d+\.\d+)?$/,
        exclude: /(bootstrap-icons|simple-icons)/,
        use: [
          {
            loader: "file-loader",
            options: {
              name: "[name].[ext]",
              outputPath: "fonts/",
              publicPath: "fonts/",
            },
          },
        ],
      },
      {
        test: /\.ya?ml$/,
        type: "json", // Required by Webpack v4
        use: "yaml-loader",
      },
    ],
  },
};
