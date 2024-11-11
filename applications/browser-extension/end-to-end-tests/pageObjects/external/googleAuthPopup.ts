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
import {
  E2E_GOOGLE_TEST_USER_EMAIL,
  E2E_GOOGLE_TEST_USER_OTP_KEY,
  E2E_GOOGLE_TEST_USER_PASSWORD,
} from "../../env";
import { generateOTP } from "../../utils";

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
    if (E2E_GOOGLE_TEST_USER_OTP_KEY === undefined) {
      throw new Error("Google test user OTP key is not configured");
    }

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

/**
 * Class to interact with the Google Auth popup
 * @param page The google authentication popup page object. Use `context.waitForEvent("page", { timeout: 3000 });` to get the popup page.
 */
export class GoogleAuthPopup {
  constructor(private readonly page: Page) {}

  private async continueAndAllow() {
    // Conditionally click on Continue button if present
    try {
      const continueButton = this.page.getByRole("button", {
        name: "Continue",
      });
      await continueButton.waitFor({ state: "visible", timeout: 5000 });
      await continueButton.click();
    } catch {
      // Continue button not present, do nothing
    }

    // Provide Pixiebrix access to drive resources
    const allowButton = this.page.getByRole("button", { name: "Allow" });
    await expect(allowButton).toBeVisible();
    await allowButton.click();
  }

  async logInAndAllowAccess() {
    if (
      E2E_GOOGLE_TEST_USER_EMAIL === undefined ||
      E2E_GOOGLE_TEST_USER_PASSWORD === undefined ||
      E2E_GOOGLE_TEST_USER_OTP_KEY === undefined
    ) {
      throw new Error("Google test user credentials are not configured");
    }

    // eslint-disable-next-line playwright/no-wait-for-selector -- waitForSelector is needed to wait for the page to be ready
    await this.page.waitForSelector("#identifierId");

    // Authenticate with email and password
    await this.page
      .getByLabel("Email or Phone")
      .fill(E2E_GOOGLE_TEST_USER_EMAIL);
    await this.page.getByRole("button", { name: "Next" }).click();
    await this.page
      .getByLabel("Enter your password")
      .fill(E2E_GOOGLE_TEST_USER_PASSWORD);
    await this.page.getByLabel("Enter your password").press("Enter");

    // Two-factor authentication. Requires two OTP codes.
    await submitOtpCode(this.page);
    await expect(
      this.page.getByText("Verify it’s you", { exact: true }),
    ).toBeVisible();
    await submitOtpCode(this.page);

    await this.continueAndAllow();
  }

  async chooseAccountAndAllowAccess() {
    await expect(
      this.page.getByRole("heading", { name: "Choose an account" }),
    ).toBeVisible();

    await this.page
      .getByRole("link", { name: E2E_GOOGLE_TEST_USER_EMAIL })
      .click({ timeout: 3000 });

    await this.continueAndAllow();
  }
}
