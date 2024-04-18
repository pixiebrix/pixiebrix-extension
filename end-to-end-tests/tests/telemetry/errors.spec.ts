import { test, expect } from "../../fixtures/extensionBase";
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { test as base } from "@playwright/test";
import { getBaseExtensionConsoleUrl } from "../../pageObjects/constants";

test("can report application error to telemetry service", async ({
  page,
  context,
  extensionId,
}) => {
  await context.route("https://app.pixiebrix.com/api/me/", async (route) => {
    await route.fulfill({
      status: 500,
    });
  });

  let endpointCalled = false;
  await context.route(
    "https://browser-intake-datadoghq.com/api/v2/logs",
    async (route) => {
      expect(route.request().postDataJSON()).toMatchObject({
        service: "pixiebrix-browser-extension",
        // TODO: potentially assert more props here
      });

      endpointCalled = true;

      return route.fulfill({ status: 200 });
    },
  );

  await page.goto(getBaseExtensionConsoleUrl(extensionId));
  await expect(page.getByText("Something went wrong.")).toBeVisible();

  expect(endpointCalled).toBe(true);
});
