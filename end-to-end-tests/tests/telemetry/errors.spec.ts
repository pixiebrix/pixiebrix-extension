import { test, expect } from "../../fixtures/extensionBase";
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { type Page, test as base } from "@playwright/test";
import { getBaseExtensionConsoleUrl } from "../../pageObjects/constants";
import { MV } from "../../env";

// TODO: Fix this test for MV2
test.skip(
  MV === "2",
  "Temporarily skipping this test due to inconsistencies with error display in manifest versions",
);
test("can report application error to telemetry service", async ({
  page,
  context,
  extensionId,
}) => {
  const errorServiceEndpoint = "https://browser-intake-datadoghq.com/api/v2/*";

  await context.route(
    "https://app.pixiebrix.com/api/extensions/",
    async (route) => {
      await route.fulfill({
        status: 200,
        // Returning a bad response to trigger an error
        body: JSON.stringify([{}]),
      });
    },
  );

  await context.route(errorServiceEndpoint, async (route) => {
    await route.fulfill({
      status: 202,
    });
  });

  await page.goto(getBaseExtensionConsoleUrl(extensionId));
  await expect(page.getByText("Something went wrong.")).toBeVisible();

  // Due to service worker limitations with the Datadog SDK, we need to report errors via an offscreen document
  // (see https://github.com/pixiebrix/pixiebrix-extension/issues/8268). The offscreen document is created when
  // the first error is reported, so we need to wait for it to be created before we can interact with it.
  let offscreenPage: Page | undefined;
  await expect(async () => {
    offscreenPage = context
      .pages()
      .find((value) =>
        value
          .url()
          .startsWith(`chrome-extension://${extensionId}/offscreen.html`),
      );

    expect(offscreenPage?.url()).toBeDefined();
  }).toPass({ timeout: 5000 });

  // TODO: due to Datadog SDK implementation, it will take ~30 seconds for the
  //  request to be sent. We should figure out a way to induce the request to be sent sooner.
  const request = await offscreenPage?.waitForRequest(errorServiceEndpoint);

  expect(
    request
      ?.postData()
      ?.split("\n")
      .map((log) => JSON.parse(log)),
  ).toContainEqual(
    expect.objectContaining({
      service: "pixiebrix-browser-extension",
      manifestVersion: Number(MV),
      error: expect.anything(),
    }),
  );
});
