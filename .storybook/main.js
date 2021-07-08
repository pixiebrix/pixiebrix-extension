const path = require("path");

const rootDir = path.resolve(__dirname, "../");

module.exports = {
  stories: ["../src/**/*.stories.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: ["@storybook/addon-links", "@storybook/addon-essentials"],
  core: {
    builder: "webpack5",
  },
  webpackFinal: async (config, { configType }) => {
    // https://storybook.js.org/docs/riot/configure/webpack#extending-storybooks-webpack-config

    config.resolve.alias = {
      "@": path.resolve(rootDir, "src"),
      "@img": path.resolve(rootDir, "img"),
      "@contrib": path.resolve(rootDir, "contrib"),
      "@schemas": path.resolve(rootDir, "schemas"),
      vendors: path.resolve(rootDir, "src/vendors"),
    };

    config.module.rules.push({
      test: /\.scss$/,
      use: [
        // style-loader loads the css into the DOM
        "style-loader",
        "css-loader",
        { loader: "sass-loader", options: { sourceMap: true } },
      ],
    });

    return config;
  },
};
