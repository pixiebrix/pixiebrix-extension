import { test, expect } from "../../fixtures/extensionBase";
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { type Page, test as base } from "@playwright/test";
import { getBaseExtensionConsoleUrl } from "../../pageObjects/constants";

test("can report application error to telemetry service", async ({
  page,
  context,
  extensionId,
}) => {
  await context.route(
    "https://app.pixiebrix.com/api/registry/bricks/",
    async (route) => {
      await route.fulfill({
        status: 200,
        // Returning a bad response to trigger an error
        body: JSON.stringify([{}]),
      });
    },
  );

  await context.route(
    "https://browser-intake-datadoghq.com/api/v2/*",
    async (route) => {
      await route.fulfill({
        status: 202,
      });
    },
  );

  await page.goto(getBaseExtensionConsoleUrl(extensionId));
  await expect(page.getByText("An error occurred")).toBeVisible();

  // The offscreen document is created when the first error is reported,
  // so we need to wait for it to be created before we can interact with it
  let offscreenPage: Page;
  await expect(async () => {
    offscreenPage = context
      .pages()
      .find((value) =>
        value
          .url()
          .startsWith(`chrome-extension://${extensionId}/offscreen.html`),
      );

    expect(offscreenPage.url()).toBeDefined();
  }).toPass({ timeout: 5000 });

  // TODO: due to the way the Datadog SDK is implemented, it will take ~30 seconds for the
  //  request to be sent. We should figure out a way to induce the request being sent sooner.
  await offscreenPage.waitForRequest(
    "https://browser-intake-datadoghq.com/api/v2/*",
  );
});
