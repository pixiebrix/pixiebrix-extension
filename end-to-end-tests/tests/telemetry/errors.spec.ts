import { test, expect } from "../../fixtures/testBase";
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { type BrowserContext, type Page, test as base } from "@playwright/test";
import { getBaseExtensionConsoleUrl } from "../../pageObjects/constants";

async function waitForBackgroundPageRequest(
  context: BrowserContext,
  extensionId: string,
  errorServiceEndpoint: string,
) {
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
  return offscreenPage?.waitForRequest(errorServiceEndpoint);
}

async function getSentErrors(
  extensionId: string,
  context: BrowserContext,
  errorServiceEndpoint: "https://browser-intake-datadoghq.com/api/v2/*",
) {
  // TODO: due to Datadog SDK implementation, it will take ~30 seconds for the
  //  request to be sent. We should figure out a way to induce the request to be sent sooner.
  //  See this datadog support request: https://help.datadoghq.com/hc/en-us/requests/1754158
  const request = await waitForBackgroundPageRequest(
    context,
    extensionId,
    errorServiceEndpoint,
  );

  return request
    ?.postData()
    ?.split("\n")
    .map((log) => JSON.parse(log));
}

test.use({
  additionalRequiredEnvVariables: [
    "DATADOG_CLIENT_TOKEN",
    "DEV_EVENT_TELEMETRY",
  ],
});

test("can report extension console error to telemetry service", async ({
  page,
  context,
  extensionId,
}) => {
  const errorServiceEndpoint = "https://browser-intake-datadoghq.com/api/v2/*";

  await test.step("Mock the extensions endpoint to return a bad response, and mock errorService calls", async () => {
    await context.route(
      "https://app.pixiebrix.com/api/extensions/",
      async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([{}]),
        });
      },
    );

    await context.route(errorServiceEndpoint, async (route) =>
      route.fulfill({
        status: 202,
      }),
    );
  });

  await page.goto(getBaseExtensionConsoleUrl(extensionId));
  await expect(page.getByText("Something went wrong.")).toBeVisible();

  const sentErrors = await getSentErrors(
    extensionId,
    context,
    errorServiceEndpoint,
  );

  expect(sentErrors).toContainEqual(
    expect.objectContaining({
      service: "pixiebrix-browser-extension",
      manifestVersion: 3,
      error: expect.objectContaining({
        stack: expect.any(String),
        message: expect.any(String),
        kind: expect.any(String),
      }),
      // Stack and message are duplicated
      stack: expect.any(String),
      message: expect.any(String),
      connectionType: expect.any(String),
      date: expect.any(Number),
      extensionVersion: expect.any(String),
      name: expect.any(String),
      origin: "logger",
      pageName: "options",
      referrer: "",
      runtimeId: extensionId,
      session_id: expect.any(String),
      status: "error",
      url: `chrome-extension://${extensionId}/options.html#/`,
      usr: {
        email: "extension-e2e-test.unaffiliated@pixiebrix.test",
        id: "3f7ac0b4-5029-442c-b537-5de9f1dfdfd9",
        organizationId: "47f616c5-81e3-4edb-ba44-ed5dd4a78c08",
      },
      view: {
        referrer: "",
        url: `chrome-extension://${extensionId}/offscreen.html`,
      },
    }),
  );
});

test("can report a service worker error to telemetry service", async ({
  page,
  context,
  extensionId,
}) => {
  const errorServiceEndpoint = "https://browser-intake-datadoghq.com/api/v2/*";

  await test.step("Mock the registry endpoint to return a bad response, and mock errorService calls", async () => {
    await context.route(
      "https://app.pixiebrix.com/api/registry/bricks/",
      async (route) => {
        await route.fulfill({
          status: 500,
          body: "I'm not json!",
        });
      },
    );

    await context.route(errorServiceEndpoint, async (route) =>
      route.fulfill({
        status: 202,
      }),
    );
  });

  await page.goto(getBaseExtensionConsoleUrl(extensionId));
  await expect(page.getByText("An error occurred")).toBeVisible();

  const sentErrors = await getSentErrors(
    extensionId,
    context,
    errorServiceEndpoint,
  );

  expect(sentErrors).toContainEqual(
    expect.objectContaining({
      code: "ERR_BAD_RESPONSE",
      code_version: expect.any(String),
      connectionType: "4g",
      date: expect.any(Number),
      error: expect.objectContaining({
        kind: "AxiosError",
        message: expect.any(String),
        stack: expect.any(String),
      }),
      extensionVersion: expect.any(String),
      manifestVersion: 3,
      message: expect.any(String),
      name: "AxiosError",
      origin: "logger",
      pageName: "background",
      referrer: "",
      runtimeId: extensionId,
      service: "pixiebrix-browser-extension",
      session_id: expect.any(String),
      stack: expect.any(String),
      status: "error",
      url: "https://app.pixiebrix.com/api/registry/bricks/",
      usr: {
        email: "extension-e2e-test.unaffiliated@pixiebrix.test",
        id: "3f7ac0b4-5029-442c-b537-5de9f1dfdfd9",
        organizationId: "47f616c5-81e3-4edb-ba44-ed5dd4a78c08",
      },
      view: {
        referrer: "",
        url: `chrome-extension://${extensionId}/offscreen.html`,
      },
    }),
  );
});
