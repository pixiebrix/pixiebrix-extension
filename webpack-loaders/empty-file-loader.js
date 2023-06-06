/*
 * Mostly copied from the file-loader webpack loader:
 * https://github.com/webpack-contrib/file-loader/blob/master/src/index.js
 */

const path = require("node:path");
const { interpolateName } = require("loader-utils");

module.exports = function (content) {
  content = "";

  const options = this.getOptions();

  const context = this.rootContext;
  const name = "[name].[ext]";

  const filename = interpolateName(this, name, {
    context,
    content,
  });

  const outputPath = path.posix.join(options.outputPath, filename);

  this.emitFile(outputPath, content, null);

  return "";
};
