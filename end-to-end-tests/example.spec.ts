/*
 * Copyright (C) 2024 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { test, expect } from "@playwright/test";

test.describe("create-react-app", () => {
  test("basic auth smoke test", async ({ page }) => {
    await page.goto(process.env.SERVICE_URL);
    await expect(
      page.getByText(process.env.E2E_TEST_USER_EMAIL_UNAFFILIATED),
    ).toBeVisible();
  });

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
