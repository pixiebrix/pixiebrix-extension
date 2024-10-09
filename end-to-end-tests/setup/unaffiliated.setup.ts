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
  CI,
  E2E_GOOGLE_TEST_USER_EMAIL,
  E2E_TEST_USER_EMAIL_UNAFFILIATED,
  E2E_TEST_USER_PASSWORD_UNAFFILIATED,
  SERVICE_URL,
} from "../env";
import { ensureVisibility } from "../utils";
import { LocalIntegrationsPage } from "../pageObjects/extensionConsole/localIntegrationsPage";
import { GoogleAuthPopup } from "../pageObjects/external/googleAuthPopup";
import { openExtensionConsoleFromAdmin } from "./utils";

test("authenticate with unaffiliated user", async ({
  contextAndPage: { context, page },
}) => {
  test.slow(
    true,
    "Test is slow due to two-factor authentication and loading times",
  );

  await test.step("Login with unaffiliated user and link to Admin console page", async () => {
    await page.goto(`${SERVICE_URL}/login/email`);
    await page.getByLabel("Email").fill(E2E_TEST_USER_EMAIL_UNAFFILIATED);
    await page.getByLabel("Password").fill(E2E_TEST_USER_PASSWORD_UNAFFILIATED);
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL(SERVICE_URL);
    await ensureVisibility(
      page.getByText(
        "Successfully linked the Browser Extension to your PixieBrix account",
      ),
    );
    await expect(
      page.getByText(E2E_TEST_USER_EMAIL_UNAFFILIATED),
    ).toBeVisible();
    await expect(page.getByText("Admin Console")).toBeVisible();
  });

  let extensionConsolePage: Page;
  await test.step("Open Extension Console", async () => {
    extensionConsolePage = await openExtensionConsoleFromAdmin(
      page,
      context,
      E2E_TEST_USER_EMAIL_UNAFFILIATED,
    );
  });

  // Skipping authentication in CI due to flakiness -- captcha checking
  // TODO: https://github.com/pixiebrix/pixiebrix-extension/issues/8058
  // eslint-disable-next-line playwright/no-conditional-in-test -- see above
  if (CI === undefined && E2E_GOOGLE_TEST_USER_EMAIL !== undefined) {
    await test.step("Authenticate with Google and add a local Drive integration", async () => {
      const localIntegrationsPage = new LocalIntegrationsPage(
        extensionConsolePage,
      );
      await localIntegrationsPage.goto();

      const popupPromise = context.waitForEvent("page", { timeout: 20_000 });
      await localIntegrationsPage.createNewIntegration("Google Drive");

      const googleAuthPopup = await popupPromise;
      const googleAuthPopupPage = new GoogleAuthPopup(googleAuthPopup);
      await googleAuthPopupPage.logInAndAllowAccess();

      // eslint-disable-next-line playwright/no-conditional-expect -- see #8058
      await expect(
        extensionConsolePage.getByRole("cell", {
          name: "Icon Google Drive google/",
        }),
      ).toBeVisible();
      // NOTE: if the tab is closed before the integration label is updated from the google api info call, the integration
      // name will be "Google Drive Config" instead of the test user email.
      // eslint-disable-next-line playwright/no-conditional-expect -- see #8058
      await expect(
        extensionConsolePage.getByRole("cell", {
          name: E2E_GOOGLE_TEST_USER_EMAIL,
        }),
      ).toBeVisible();
    });
  }
});
