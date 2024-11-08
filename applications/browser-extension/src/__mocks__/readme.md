## `__mocks__`

Any file in this folder is picked up automatically by both Jest and Storybook.

- `import "@/some/thing"` will auto-load `src/__mocks__/@/some/thing.js|ts|tsx`
- `import "published-module"` will auto-load `src/__mocks__/published-module.js|ts|tsx`

### Setup

- Jest: https://github.com/pixiebrix/pixiebrix-extension/blob/d834064d9e18d0b799cc890110dc35eea8be6daa/jest.config.js#L66
- Storybook: https://github.com/pixiebrix/pixiebrix-extension/blob/d834064d9e18d0b799cc890110dc35eea8be6daa/.storybook/main.js#L50-L63

### jest.unmock()

Since these imports work via module resolution, they're not actually treated as "mocks" by Jest, so it can't "unmock" them.

To do that, use `jest.mock` and `jest.requireActual` to change the resolution, for example:

```js
// Disable automatic __mocks__ resolution #6799
jest.mock("applications/browser-extension/src/__mocks__/@/telemetry/logging", () => jest.requireActual("./logging.ts"));
```

Note that you can't use `@/` in `requireActual` as that will likely still use the auto-mock.

### Using jest.fn in `__mocks__/@`

If the mocked file is simple:

```ts
// @/file.ts

export const complexApiCall = () => {
  // Some API call
};
```

You can just export the mocked content:

```ts
// __mocks__/@/file.ts

export const complexApiCall = jest.fn();
```

If it has a lot of exports, you'll have to mock them all, or re-export them from the original file and then override the export you want to mock:

```ts
// __mocks__/@/file.ts

// Bypass auto-mocks
export * from "../../../../file";

export const complexApiCall = jest.fn();
```

Auto-mocking is based on `@` so anything that doesn't use it will skip it.
