import { test, expect } from "@playwright/test";

test.describe("create-react-app", () => {
  test("has title", async ({ page }) => {
    await page.goto("/create-react-app/");

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Home/);
  });

  test("get started link", async ({ page }) => {
    await page.goto("/create-react-app/");

    // Click the get started link.
    await page.getByRole("link", { name: "Table" }).click();

    // Expects page to have a heading with the name of Installation.
    await expect(
      page.getByRole("heading", { name: "Transaction Table" }),
    ).toBeVisible();
  });
});
