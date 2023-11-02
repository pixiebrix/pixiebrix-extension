## `__mocks__`

Any file in this folder is picked up automatically by both Jest and Storybook.

- `import "@/some/thing"` will auto-load `src/__mocks__/@/some/thing.js|ts|tsx`
- `import "published-module"` will auto-load `src/__mocks__/published-module.js|ts|tsx`

### Setup

- Jest: https://github.com/pixiebrix/pixiebrix-extension/blob/d834064d9e18d0b799cc890110dc35eea8be6daa/jest.config.js#L66
- Storybook: https://github.com/pixiebrix/pixiebrix-extension/blob/d834064d9e18d0b799cc890110dc35eea8be6daa/.storybook/main.js#L50-L63
- headers.ts: https://github.com/pixiebrix/pixiebrix-extension/blob/d834064d9e18d0b799cc890110dc35eea8be6daa/scripts/webpack.scripts.js#L43

### jest.unmock()

Since these imports work via module resolution, they're not actually treated as "mocks" by Jest, so it can't "unmock" them.

To do that, use `jest.mock` and `jest.requireActual` to change the resolution, for example:

```js
// Disable automatic __mocks__ resolution #6799
jest.mock("@/telemetry/logging", () => jest.requireActual("./logging.ts"));
```

Note that you can't use `@/` in `requireActual` as that will likely still use the auto-mock.
