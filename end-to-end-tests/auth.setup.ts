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

import { expect, test as setup } from "@playwright/test";
import {
  E2E_TEST_USER_EMAIL_UNAFFILIATED,
  E2E_TEST_USER_PASSWORD_UNAFFILIATED,
  SERVICE_URL,
} from "./env";

const authFile = "end-to-end-tests/.auth/user.json";

setup("authenticate", async ({ page }) => {
  await page.goto(`${SERVICE_URL}/login/email`);

  await page.getByLabel("Email").fill(E2E_TEST_USER_EMAIL_UNAFFILIATED);
  await page.getByLabel("Password").fill(E2E_TEST_USER_PASSWORD_UNAFFILIATED);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(SERVICE_URL);
  await expect(page.getByText(E2E_TEST_USER_EMAIL_UNAFFILIATED)).toBeVisible();
  await page.context().storageState({ path: authFile });
});
