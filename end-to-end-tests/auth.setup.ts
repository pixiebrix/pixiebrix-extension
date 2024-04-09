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

import { expect, type Page } from "@playwright/test";
import { test } from "./fixtures/authSetupFixture";
import {
  E2E_TEST_USER_EMAIL_UNAFFILIATED,
  E2E_TEST_USER_PASSWORD_UNAFFILIATED,
  SERVICE_URL,
} from "./env";
import { ensureVisibility } from "./utils";

test("authenticate", async ({ contextAndPage: { context, page } }) => {
  await page.goto(`${SERVICE_URL}/login/email`);
  await page.getByLabel("Email").fill(E2E_TEST_USER_EMAIL_UNAFFILIATED);
  await page.getByLabel("Password").fill(E2E_TEST_USER_PASSWORD_UNAFFILIATED);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(SERVICE_URL);
  await ensureVisibility(
    page.getByText(
      "Successfully linked the Browser Extension to your PixieBrix account",
    ),
    { timeout: 10_000 },
  );
  await expect(page.getByText(E2E_TEST_USER_EMAIL_UNAFFILIATED)).toBeVisible();
  await expect(page.getByText("Admin Console")).toBeVisible();

  // Sometimes get the following error "Error: Could not establish connection. Receiving end does not exist." when trying to click on the "Open Extension Console" button.
  // Thus, a retry is added to ensure the extension console loads with authenticated user.
  let extensionConsolePage: Page;
  await expect(async () => {
    // Ensure the extension console loads with authenticated user
    const extensionConsolePagePromise = context.waitForEvent("page", {
      timeout: 2000,
    });
    // Extension console
    await page
      .locator("button")
      .filter({ hasText: "Open Extension Console" })
      .click();

    extensionConsolePage = await extensionConsolePagePromise;

    await expect(extensionConsolePage.locator("#container")).toContainText(
      "Extension Console",
    );
  }).toPass({ timeout: 6000 });

  await ensureVisibility(
    extensionConsolePage.getByText(E2E_TEST_USER_EMAIL_UNAFFILIATED),
    { timeout: 10_000 },
  );
});
