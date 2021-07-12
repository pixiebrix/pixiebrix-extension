// Resolve-only webpack configuration for ESlint

const path = require("path");
const rootDir = path.resolve(__dirname, "../");

module.exports = {
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
      "@img": path.resolve(rootDir, "img"),
      "@contrib": path.resolve(rootDir, "contrib"),
      "@schemas": path.resolve(rootDir, "schemas"),
      vendors: path.resolve(rootDir, "src/vendors"),
      "@microsoft/applicationinsights-web": path.resolve(
        rootDir,
        "src/contrib/uipath/quietLogger"
      ),

      // An existence check triggers webpack’s warnings https://github.com/handlebars-lang/handlebars.js/issues/953
      handlebars: "handlebars/dist/handlebars.js",
    },
    extensions: [".ts", ".tsx", ".jsx", ".js"],
  },
};
