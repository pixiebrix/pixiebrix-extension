// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  alias: {
    fs: "./src/mock.ts",
    path: "./src/mock.ts",
  },
  optimize: {
    bundle: false,
    minify: false,
  },
  mount: {
    src: { url: "/dista" },
  },
  plugins: ["tsconfig-paths-snowpack-plugin"],
  packageOptions: {
    source: "remote",
    /* ... */
  },
  devOptions: {
    /* ... */
  },
  buildOptions: {
    /* ... */
  },
};
