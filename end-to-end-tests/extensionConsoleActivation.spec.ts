import { test, expect, linkBrowserExtensionViaAdminConsole } from "./fixtures";

test.describe("Extension Console Activation", () => {
  test("can activate a mod with no config options", async ({
    page,
    extensionId,
    baseURL,
  }) => {
    await linkBrowserExtensionViaAdminConsole(page, expect);

    await page.goto(
      `chrome-extension://${extensionId}/options.html#/marketplace/activate/${encodeURIComponent(
        "@pixies/giphy/giphy-search",
      )}`,
    );

    await expect(page.getByText("Activate Mod")).toBeVisible();
    await expect(page.getByText("GIPHY Search")).toBeVisible();
    await page.click("button:has-text('Activate')");
    await expect(page.getByText("Installed GIPHY Search")).toBeVisible();

    // TODO assert on mods page that the mod is activated
    await page.goto(baseURL);
    await page.waitForTimeout(5000);
    await page.getByText("Index of  /").click();
    await page.locator("body").press("Meta+M");
    await page.waitForTimeout(5000);
    await page.keyboard.press("Enter");
    await page.getByText("GIPHY Search").click();
  });
});
