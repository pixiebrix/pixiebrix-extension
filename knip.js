const configFactory = require("./webpack.config.js");
const config = configFactory(process.env, {});

// https://knip.dev/overview/configuration#customize
const knipConfig = {
  $schema: "https://unpkg.com/knip@3/schema.json",
  entry: [
    ...Object.values(config.entry).map((x) =>
      `${x}.{ts,tsx,js,jsx}`.replace("./", ""),
    ),
    "src/development/headers.ts",
  ],
  project: ["src/**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}"],
  // https://knip.dev/guides/handling-issues#mocks-and-other-implicit-imports
  ignore: ["**/__mocks__/**", "@contrib/**"],
};

console.log(JSON.stringify(knipConfig, null, 2));

export default knipConfig;
