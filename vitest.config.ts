import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      { find: /\.s?css$/, replacement: "identity-obj-proxy" },
      {
        find: /\.(gif|svg|png)$|\?loadAsUrl$|\?loadAsComponent$/,
        replacement: "src/__mocks__/stringMock.js",
      },
      { find: /^@contrib\/(.*?)(\?loadAsText)?$/, replacement: "/contrib/$1" },
      { find: /^@schemas\/(.*)/, replacement: "/schemas/$1" },
      { find: /^@\/(.*)$/, replacement: "/src/$1" },
    ],
  },
  test: {
    globals: true,
    environment: "jsdom",

    setupFiles: [
      "/src/testUtils/testEnv.js",
      "jest-webextension-mock",
      "fake-indexeddb/auto",
    ],
  },
});
