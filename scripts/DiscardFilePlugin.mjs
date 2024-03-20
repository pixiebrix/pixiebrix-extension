import webpack from "webpack";
// https://github.com/pixiebrix/pixiebrix-extension/pull/7363#discussion_r1458224740
export default class DiscardFilePlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap("DiscardFilePlugin", (compilation) => {
      compilation.hooks.processAssets.tapPromise(
        {
          name: "DiscardFilePlugin",
          stage: webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE,
        },
        async (assets) => {
          delete assets["DocumentView.js"];
          delete assets["EphemeralFormContent.js"];
          delete assets["CustomFormComponent.js"];
          // If this causes issues in the future, try replacing the content instead:
          // assets["DocumentView.js"] = new webpack.sources.RawSource('"Dropped"');
        },
      );
    });
  }
}
