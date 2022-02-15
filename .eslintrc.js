const contexts = [
  "background",
  "contentScript",
  "devTools",
  "options",
  "actionPanel",
  // "pageScript", // TODO: After Messenger migration
];

const restrictedZones = [];
for (const exporter of contexts) {
  for (const importer of contexts) {
    if (exporter !== importer) {
      restrictedZones.push({
        target: `./src/${importer}/**/*`,
        from: `./src/${exporter}`,
        except: [
          `../${exporter}/messenger/api.ts`,
          `../${exporter}/types.ts`,
          `../${exporter}/nativeEditor/types.ts`,
        ],
      });
    }
  }
}

module.exports = {
  root: true,
  extends: [
    // Full config: https://github.com/fregante/eslint-config-pixiebrix/blob/main/index.js
    "pixiebrix",
  ],
  rules: {
    "import/no-restricted-paths": [
      "error",
      {
        zones: restrictedZones,
      },
    ],

    // Only enable this on tsx files
    "filenames/match-exported": "off",

    // Avoid imports with side effects
    "import/no-unassigned-import": [
      "error",
      {
        allow: [
          "**/*.css",
          "**/*.scss",
          "@/development/*",
          "@/messaging/external",
          "@/extensionContext", // Must be run before other code
          "@/background/axiosFetch", // Must be run before other code
          "@/telemetry/reportUncaughtErrors",
          "@testing-library/jest-dom",
          "webext-dynamic-content-scripts", // Automatic registration
          "regenerator-runtime/runtime", // Automatic registration
        ],
      },
    ],

    // Incorrectly suggests to use `runtime.sendMessage` instead of `browser.runtime.sendMessage`
    "import/no-named-as-default-member": "off",

    // TODO: The rule is currently broken, it should accept `throw unknown` but doesn't
    "@typescript-eslint/no-throw-literal": "off",

    // TODO: Import extended config from app, after improving it
    "@typescript-eslint/naming-convention": "off",

    // The rule is unreasonably slow (90 sec lint -> 5 minutes)
    // https://github.com/pixiebrix/pixiebrix-extension/issues/1080
    "import/no-cycle": "off",

    // Rules that depend on https://github.com/pixiebrix/pixiebrix-extension/issues/775
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/restrict-template-expressions": "warn",
    "@typescript-eslint/no-unnecessary-type-assertion": "warn",

    // Rules to fix and enforce over time
    "no-await-in-loop": "warn",
    "unicorn/consistent-function-scoping": "warn", // Complains about some of the lifted functions
    "unicorn/no-await-expression-member": "warn", // Annoying sometimes, let's try it
    "@typescript-eslint/consistent-type-assertions": "warn",
  },
  ignorePatterns: [
    "node_modules",
    ".idea",
    "dist",
    "artifacts",
    "scripts/bin",
    "src/vendors",
    "src/types/swagger.ts",
    "src/nativeEditor/Overlay.tsx",
    "selenium",
  ],
  overrides: [
    {
      files: ["**/*.tsx", "**/use*.ts"],
      excludedFiles: ["*.test.tsx", "*.stories.tsx"],
      rules: {
        "filenames/match-exported": "error",
      },
    },
    {
      files: [
        "webpack.*.js",
        "*.config.js",
        "test-env.js",
        "**/__mocks__/**",
        "*.test.js",
      ],
      env: {
        node: true,
        jest: true,
      },
      extends: ["pixiebrix/server"],
      rules: {
        // TODO: Import extended config from app, after improving it
        "@typescript-eslint/naming-convention": "off",
      },
    },
    {
      files: ["*.stories.tsx", "**/__mocks__/**"],
      rules: {
        "unicorn/filename-case": "off",
        "import/no-anonymous-default-export": "off",
      },
    },
  ],
};
