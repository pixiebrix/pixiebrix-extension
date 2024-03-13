import { test, expect } from "./fixtures/extensionBase";

test("can activate a mod with config options", async ({
  page,
  extensionId,
  baseURL,
}) => {
  const modName = "Highlight Specific Keywords When Page Loads";
  const modId = "@pixies/highlight-keywords";

  await page.goto(
    `chrome-extension://${extensionId}/options.html#/marketplace/activate/${encodeURIComponent(
      modId,
    )}`,
  );

  await expect(page.getByText("Activate Mod")).toBeVisible();
  await expect(page.getByText(modName)).toBeVisible();
  await page.click("button:has-text('Activate')");
  await expect(page.getByText(`Installed ${modName}`)).toBeVisible();

  // TODO -- assert on mods page that the mod is activated
  await page.goto(baseURL);
  await page.click("a[title='/bootstrap-5']");

  for (const element of await page.locator("mark").all()) {
    await expect(element).toHaveText("PixieBrix");
  }
});
