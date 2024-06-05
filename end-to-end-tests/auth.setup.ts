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
import { test } from "./fixtures/authSetup";
import {
  E2E_GOOGLE_TEST_USER_EMAIL,
  E2E_GOOGLE_TEST_USER_OTP_KEY,
  E2E_GOOGLE_TEST_USER_PASSWORD,
  E2E_TEST_USER_EMAIL_UNAFFILIATED,
  E2E_TEST_USER_PASSWORD_UNAFFILIATED,
  SERVICE_URL,
} from "./env";
import { ensureVisibility, generateOTP } from "./utils";
import { LocalIntegrationsPage } from "./pageObjects/extensionConsole/localIntegrationsPage";

/**
 * Submit the OTP code to the Google Auth popup. This function will wait for the OTP code input to be visible and then
 * submit the OTP code generated from the provided OTP key from the environment variables. This function will also
 * handle the case where the OTP code is incorrect and will retry submitting the OTP code.
 * @param googleAuthPopup The Google Auth popup page
 */
const submitOtpCode = async (googleAuthPopup: Page) => {
  const enterCode = googleAuthPopup.getByLabel("Enter code");
  const totpNext = googleAuthPopup.getByRole("button", { name: "Next" });
  const wrongCodeError = googleAuthPopup.getByText("Wrong code");

  await enterCode.waitFor({ state: "visible", timeout: 5000 });
  let prevToken = "";

  await expect(async () => {
    await enterCode.click();
    const otpKey = E2E_GOOGLE_TEST_USER_OTP_KEY.replaceAll(/\s/g, "");
    const token = generateOTP(otpKey);
    expect(token).not.toStrictEqual(prevToken); // Ensure the token is different from the previous one on retry
    prevToken = token;
    await enterCode.fill(token);
    await totpNext.click();
    // Wait for submission to complete to see if the code was correct
    await googleAuthPopup.waitForTimeout(2000);
    await expect(wrongCodeError).toBeHidden();
  }).toPass({ timeout: 40_000 }); // Codes rotate every 30 seconds
};

test("authenticate", async ({ contextAndPage: { context, page } }) => {
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
      { timeout: 12_000 },
    );
    await expect(
      page.getByText(E2E_TEST_USER_EMAIL_UNAFFILIATED),
    ).toBeVisible();
    await expect(page.getByText("Admin Console")).toBeVisible();
  });

  let extensionConsolePage: Page;
  await test.step("Open Extension Console", async () => {
    // Sometimes get the following error "Error: Could not establish connection. Receiving end does not exist."
    // when trying to click on the "Open Extension Console" button. This happens when the Extension has not fully
    // initialized to be able to receive messages via the external messenger api, which happens when the Extension
    // reloads after linking. Thus, we wrap the following with an `expect.toPass` retry.
    await expect(async () => {
      // Ensure the extension console loads with authenticated user
      const extensionConsolePagePromise = context.waitForEvent("page", {
        timeout: 2000,
      });
      await page
        .locator("button")
        .filter({ hasText: "Open Extension Console" })
        .click();

      extensionConsolePage = await extensionConsolePagePromise;

      await expect(extensionConsolePage.locator("#container")).toContainText(
        "Extension Console",
      );
    }).toPass({ timeout: 10_000 });

    await ensureVisibility(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion,@typescript-eslint/no-unnecessary-type-assertion -- checked above
      extensionConsolePage!.getByText(E2E_TEST_USER_EMAIL_UNAFFILIATED),
      // The first time the extension console is opened after logging in, it sometimes takes a while to load the extension console
      { timeout: 16_000 },
    );
  });

  await test.step("Authenticate with Google and add a local Drive integration", async () => {
    const localIntegrationsPage = new LocalIntegrationsPage(
      extensionConsolePage,
    );
    await localIntegrationsPage.goto();

    const popupPromise = context.waitForEvent("page", { timeout: 3000 });
    await localIntegrationsPage.createNewIntegration("Google Drive");

    const googleAuthPopup = await popupPromise;
    await googleAuthPopup.waitForSelector("#identifierId");

    // Authenticate with email and password
    await googleAuthPopup
      .getByLabel("Email or Phone")
      .fill(E2E_GOOGLE_TEST_USER_EMAIL);
    await googleAuthPopup.getByRole("button", { name: "Next" }).click();
    await googleAuthPopup
      .getByLabel("Enter your password")
      .fill(E2E_GOOGLE_TEST_USER_PASSWORD);
    await googleAuthPopup.getByLabel("Enter your password").press("Enter");

    // Two-factor authentication. Requires two OTP codes.
    await submitOtpCode(googleAuthPopup);
    await submitOtpCode(googleAuthPopup);

    // Conditionally click on Continue button if present
    try {
      const continueButton = googleAuthPopup.getByRole("button", {
        name: "Continue",
      });
      await continueButton.waitFor({ state: "visible", timeout: 5000 });
      await continueButton.click();
    } catch {
      // Continue button not present, do nothing
    }

    // Provide Pixiebrix access to drive resources
    const allowButton = googleAuthPopup.getByRole("button", { name: "Allow" });
    await expect(allowButton).toBeVisible();
    await allowButton.click();

    await expect(
      extensionConsolePage.getByRole("cell", {
        name: "Icon Google Drive google/",
      }),
    ).toBeVisible();
  });
});
