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

import { test as setup } from "@playwright/test";
import { config } from "dotenv";

config({ path: "../../.env.development" });
setup("authenticate", async ({ page }) => {
  console.log(process.env.CHROME_MANIFEST_KEY);
  // TODO - how to get the service url to work without using the baseURL in config
  // await page.goto(`${process.env.SERVICE_URL}/login`);
  await page.goto("https://app.pixiebrix.com/login/email");
  await page.getByLabel("Email").fill("username");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Log in" }).click();
});
