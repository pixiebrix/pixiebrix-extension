# Selenium testing

## Before starting

**Note:** The tests require a built extension. It's best to start fresh with a production build:

```sh
rm -rf dist
npm run build
```

## Run locally

```sh
npm run test:selenium
```

## Run on browserstack

You will need to specify your keys as ENV variables, for example:

```sh
rm -rf dist
CI=true npm run build
BROWSERSTACK_ACCESS_KEY=63azqC BROWSERSTACK_USERNAME=federico_1Jh npm run test:selenium
```

The extension will need to be uploaded and it might take 1-2 minutes to do so. To speed things up and avoid timeouts, the special `CI` build command will create the smallest possible bundle.

## Testing in Firefox

The tests can be run in Firefox by setting a `BROWSER` ENV variable:

```sh
BROWSER=firefox npm run test:selenium
```

# Links

Some more information and testing exploration may be found in:

- https://github.com/pixiebrix/pixiebrix-extension/wiki/Web-Extension-Testing-Reference
- https://github.com/pixiebrix/pixiebrix-extension/pull/1139
- https://github.com/pixiebrix/pixiebrix-extension/pull/749
