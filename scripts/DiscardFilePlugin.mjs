import webpack from "webpack";
// eslint-disable-next-line no-restricted-imports -- TODO: Rule should not apply here
import isolatedComponentList from "../src/components/isolatedComponentList.mjs";

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
          // These files are not used, they're only webpack entry points in order to generate
          // a full CSS files that can be injected in shadow DOM. See this for more context:
          // https://github.com/webpack-contrib/mini-css-extract-plugin/issues/1092#issuecomment-2037540032
          for (const componentPath of isolatedComponentList) {
            delete assets[`${componentPath.split("/").pop()}.js`];
            // If `delete assets[]` causes issues in the future, try replacing the content instead:
            // assets["DocumentView.js"] = new webpack.sources.RawSource('"Dropped"');
          }

          // TODO: Remove these 3 from here and use <IsolatedComponent/>
          delete assets["DocumentView.js"];
          delete assets["EphemeralFormContent.js"];
          delete assets["CustomFormComponent.js"];
        },
      );
    });
  }
}
