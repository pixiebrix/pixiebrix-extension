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
import { test } from "../fixtures/authentication";
import {
  E2E_TEST_USER_EMAIL_AFFILIATED,
  E2E_TEST_USER_PASSWORD_AFFILIATED,
  SERVICE_URL,
} from "../env";
import { ensureVisibility } from "../utils";
import { ModsPage } from "../pageObjects/extensionConsole/modsPage";
import { getExtensionId } from "../fixtures/utils";
import { openExtensionConsoleFromAdmin } from "./utils";

test("authenticate with affiliated user", async ({
  contextAndPage: { context, page },
}) => {
  test.slow(
    true,
    "Test is slow due to initial authentication and loading times",
  );

  await test.step("Login and link to Admin console page", async () => {
    await page.goto(`${SERVICE_URL}/login/email`);
    await page.getByLabel("Email").fill(E2E_TEST_USER_EMAIL_AFFILIATED);
    await page.getByLabel("Password").fill(E2E_TEST_USER_PASSWORD_AFFILIATED);
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL(SERVICE_URL);
    await ensureVisibility(
      page.getByText(
        "Successfully linked the Browser Extension to your PixieBrix account",
      ),
    );
    await expect(page.getByText(E2E_TEST_USER_EMAIL_AFFILIATED)).toBeVisible();
    await expect(page.getByText("Admin Console")).toBeVisible();
  });

  // We need to wait for a couple of seconds to ensure that the deployment is activated in the bg script to avoid flakiness
  // when loading the extension console. If the deployment is not activated, then a modal will pop up prompting for activation.
  // eslint-disable-next-line playwright/no-wait-for-timeout -- no easy way to detect when the bg script is done activating the deployment
  await page.waitForTimeout(5000);

  let extensionConsolePage: Page;
  await test.step("Open Extension Console", async () => {
    extensionConsolePage = await openExtensionConsoleFromAdmin(
      page,
      context,
      E2E_TEST_USER_EMAIL_AFFILIATED,
    );
  });
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- assigned in the previous step
  extensionConsolePage = extensionConsolePage!;

  await test.step("Verify the deployed mod is active", async () => {
    const extensionId = await getExtensionId(context);
    const modsPage = new ModsPage(extensionConsolePage, extensionId);

    const deployedMod = modsPage.modTableItemById(
      "@affiliated-test-team/my-pbxvercelapp-trigger",
    );
    await expect(deployedMod.getByText("version 1.0.0")).toBeVisible();
  });
});
