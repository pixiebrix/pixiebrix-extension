module.exports = {
  root: true,
  extends: [
    // Full config: https://github.com/fregante/eslint-config-pixiebrix/blob/main/index.js
    "pixiebrix",
  ],
  rules: {
    // Incorrectly suggests to use `runtime.sendMessage` instead of `browser.runtime.sendMessage`
    "import/no-named-as-default-member": "off",

    // Rules that depend on https://github.com/pixiebrix/pixiebrix-extension/issues/775
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/restrict-template-expressions": "warn",
    "@typescript-eslint/no-unnecessary-type-assertion": "warn",

    // Rules to fix and enforce over time
    "no-await-in-loop": "warn",
    "unicorn/consistent-function-scoping": "warn", // Complains about some of the lifted functions
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
      files: ["*.stories.tsx"],
      rules: {
        "filenames/match-exported": "off",
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
    },
  ],
};
