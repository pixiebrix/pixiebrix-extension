module.exports = {
  root: true,
  extends: [
    // Full config: https://github.com/fregante/eslint-config-pixiebrix/blob/main/index.js
    "pixiebrix",
  ],
  rules: {
    "unicorn/prevent-abbreviations": [
      "error",
      {
        replacements: {
          acc: false,
          arg: false,
          args: false,
          db: false,
          dev: false,
          doc: false,
          docs: false,
          env: false,
          err: false,
          ev: false,
          evt: false,
          ext: false,
          exts: false,
          fn: false,
          func: {
            fn: true,
            function: false,
          },
          i: false,
          j: false,
          num: false,
          obj: false,
          param: false,
          params: false,
          prev: false,
          prod: false,
          prop: false,
          props: false,
          ref: false,
          refs: false,
          str: false,
          var: false,
          vars: false,
        },
        ignore: ["semVer", "SemVer"],
      },
    ],

    // Incorrectly suggests to use `runtime.sendMessage` instead of `browser.runtime.sendMessage`
    "import/no-named-as-default-member": "off",

    // Rules that depend on https://github.com/pixiebrix/pixiebrix-extension/issues/775
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/restrict-template-expressions": "warn",
    "@typescript-eslint/no-unnecessary-type-assertion": "warn",

    // Rules to fix and enforce over time
    "no-await-in-loop": "warn",

    "unicorn/no-useless-undefined": "warn", // Buggy with React
    "unicorn/no-nested-ternary": "warn", // Sometimes it conflicts with Prettier
    "unicorn/consistent-function-scoping": "warn", // Complains about some of the lifted functions
    "unicorn/no-await-expression-member": "warn", // Annoying sometimes, let's try it

    "@typescript-eslint/consistent-type-assertions": "warn",

    "jsx-a11y/click-events-have-key-events": "warn",
    "jsx-a11y/no-static-element-interactions": "warn",
    "jsx-a11y/anchor-is-valid": "warn",
    "jsx-a11y/interactive-supports-focus": "warn",
    "jsx-a11y/iframe-has-title": "warn",
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
