# End-to-End Tests

This document provides information about the end-to-end tests in the `pixiebrix-extension` repository. The tests are
written using [Playwright](https://playwright.dev/), a powerful library for browser automation.

## Running the Tests

To run the end-to-end tests, follow these steps from the project root:

1. Install dependencies and build the extension - `npm install` `npm run build:webpack`
2. Install browsers (only need to run once) - `npx playwright install`
3. Run the tests using the command `npm run test:e2e`

## Writing New Tests

When writing new tests, it's important to follow the best practices outlined in
the [Playwright Best Practices](https://playwright.dev/docs/best-practices) guide. Here are some key points to keep in
mind:

- All of our tests should use the `test` object from the `extensionBase.ts` to define the test environment and interact
  with the extension.
- Use the `pageObjects` from the `./end-to-end-tests/pageObjects` directory to interact with the web pages. These
  objects encapsulate the details of the page structure, making the tests more maintainable and readable.
- Write tests that are independent of each other. Each test should set up its own state and clean up after itself.
  Use [Playwright fixtures](https://playwright.dev/docs/test-fixtures) to share setup and teardown code between tests.
- Use Playwright's auto-waiting mechanism. When performing actions like clicking or typing, Playwright automatically
  waits for the elements to be ready.

In general, write tests that describe the expected user behavior for a given feature flow. Focus on the high-level user
interactions and integration points and avoid re-testing low-level details that are already covered by unit tests.

## Debugging Tests

If a test fails, Playwright provides several tools to help debug the issue:

- Use `page.pause()` to pause the execution and open up Playwright's Inspector.
- Run the tests with `PWDEBUG=1 npm run test:e2e` to enable Playwright's debug mode.
- Run the tests with `SLOWMO=1 npm run test:e2e` to add a delay between Playwright test actions.
- Use `expect(page).toHaveSelector('.selector', { timeout: 5000 })` to wait for an element to appear and throw an error
  if it doesn't.
- If a test fails locally, Playwright will automatically open the report in the browser which will include trace details
  of the test run with screenshots and logs.

# Fixtures and Test Structure

The end-to-end tests in the `pixiebrix-extension` repository are designed to run the extension in both manifest V2 and
manifest V3 in Chrome and Edge.

## Fixtures

Fixtures in Playwright are reusable test components that can be used to set up a specific test environment. In this
project, we use a fixture file `./fixtures/extensionBase.ts` to set up the environment for running the extension.

The `extensionBase.ts` file exports a `test` object that extends Playwright's built-in `test` object with additional
methods and properties specific to our extension for linking the extension to the admin console and
getting the background page.

## Playwright Configuration

The `.playwright.config.ts` file in the root of the repository is used to configure how Playwright runs the tests including
options such as timout and retries. This configuration specifies the tests should be run in both Chrome and Edge. We also
use an additional setup project definition (in `./auth.setup.ts`) to authenticate the user before running the tests and
save these credentials to a shared storage directory (in `./.auth/user.json`).

## Further Reading

For more detailed information on writing tests with Playwright, refer to
the [Playwright Documentation](https://playwright.dev/docs/intro).
