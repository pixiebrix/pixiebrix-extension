import { test, expect, linkBrowserExtensionViaAdminConsole } from "./fixtures";

test.describe("Extension Console Activation", () => {
  test("can activate a mod with no config options", async ({
    page,
    extensionId,
  }) => {
    await linkBrowserExtensionViaAdminConsole(page, expect);

    await page.goto(
      `chrome-extension://${extensionId}/options.html#/marketplace/activate/${encodeURIComponent(
        "@pixies/template/translation",
      )}`,
    );
    await expect(page.getByText("Activate Mod")).toBeVisible();
    await expect(page.getByText("[Template]: Translation")).toBeVisible();
    await page.click("button:has-text('Activate')");
  });
});
