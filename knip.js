const configFactory = require("./webpack.config.js");

const config = configFactory(process.env, {});

// https://knip.dev/overview/configuration#customize
const knipConfig = {
  $schema: "https://unpkg.com/knip@3/schema.json",
  // Force to use webpack plugin. :shrug: it doesn't seem to be picking up entry points/aliases automatically though
  webpack: true,
  entry: [
    ...Object.values(config.entry).map((x) =>
      `${x}.{ts,tsx,js,jsx}`.replace("./", ""),
    ),
    "src/development/headers.ts",
    // Jest setup files
    "src/testUtils/testEnv.js",
    "src/testUtils/testAfterEnv.ts",
    "src/testUtils/injectRegistries.ts",
  ],
  project: ["src/**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}"],
  // https://knip.dev/guides/handling-issues#mocks-and-other-implicit-imports
  ignore: [
    "**/__mocks__/**",
    "@contrib/**",
    // Aliases defined in tsconfig.json
    "src/contrib/uipath/quietLogger.ts",
    // Development/debugging helpers
    "src/development/hook/**",
  ],

  rules: {
    // https://knip.dev/reference/issue-types/
    files: "warn",
    dependencies: "warn",
    unlisted: "warn",
    binaries: "warn",
    unresolved: "warn",
    exports: "warn",
    nsExports: "warn",
    types: "warn",
    nsTypes: "warn",
    enumMembers: "warn",
    classMembers: "warn",
    // Incrementally enforce rules over time
    duplicates: "error",
  },
};

// Echo settings to console to make CI results easier to understand/debug
console.log(JSON.stringify(knipConfig, null, 2));

export default knipConfig;
