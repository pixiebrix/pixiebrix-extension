# End-to-End Tests

This README provides guidelines for running, writing, and debugging end-to-end tests in the `pixiebrix-extension`
repository using [Playwright](https://playwright.dev/).

## Running Tests

Execute these steps from the project root to run tests:

1. Install dependencies and build the extension: Run `npm install` and `npm run build:webpack`.
2. Install browsers (required only once): Execute `npx playwright install`.
3. Run the tests: Use the command `npm run test:e2e`.

## Writing Tests

Adhere to these principles, based on the [Playwright Best Practices](https://playwright.dev/docs/best-practices):

- Utilize `test` from `extensionBase.ts` for test environment setup and extension interaction.
- Employ page objects from `./end-to-end-tests/pageObjects` for web page interactions.
- Ensure tests are self-contained, handling their own setup and cleanup.
  Leverage [Playwright fixtures](https://playwright.dev/docs/test-fixtures) for shared code.
- Rely on Playwright's auto-waiting feature for actions like clicking or typing.

Focus on testing high-level user behavior and integration points, avoiding duplication of unit test coverage.

## Debugging Tests

If a test fails, use Playwright's tools:

- Insert `page.pause()` to activate Playwright's Inspector.
- Enable debug mode: Run `PWDEBUG=1 npm run test:e2e`.
- Slow down test execution: Execute `SLOWMO=1 npm run test:e2e`.
- Confirm element presence: Use `expect(page).toHaveSelector('.selector', { timeout: 5000 })`.
- Local failed test runs will automatically display reports with trace details in the browser.

## Test Infrastructure

The tests are configured to run the extension on both manifest V2 and V3 in Chrome and Edge.

### Fixtures

Use the fixture file `./fixtures/extensionBase.ts` for test environment setup. It exports a `test` object that enhances
Playwright's built-in `test` object with extension-specific features.

### Playwright Configuration

Configure test execution via `.playwright.config.ts`, including timeout and retry options. The setup
project `./auth.setup.ts` handles user authentication and saves credentials in `./.auth/user.json`.

### GitHub CI Integration

End-to-end tests are integrated into the GitHub CI workflow, triggering on pull requests. The workflow steps are
detailed in `.github/workflows/ci.yml`.

## Additional Resources

For comprehensive Playwright testing information, consult
the [Playwright Documentation](https://playwright.dev/docs/intro).
