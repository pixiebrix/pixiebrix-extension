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

  const requestPromise = offscreenPage.waitForRequest(
    "https://browser-intake-datadoghq.com/api/v2/*",
  );

  await page.goto(getBaseExtensionConsoleUrl(extensionId));
  await expect(page.getByText("An error occurred")).toBeVisible();

  await requestPromise;
});
