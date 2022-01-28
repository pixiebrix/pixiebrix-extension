/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import pWaitFor from "p-wait-for";

/**
 * @type import("selenium-webdriver")
 * Use this instead of import  "selenium-webdriver" directly to avoid issues
 * like https://github.com/SeleniumHQ/selenium/issues/5560
 */
export const webdriver = global.__WEB_DRIVER__;

/** @type import("selenium-webdriver").WebDriver */
export const driver = global.__DRIVER__;

export async function switchToWindowWithUrl(urlRegex) {
  for (const window of await driver.getAllWindowHandles()) {
    await driver.switchTo().window(window);
    if (urlRegex.test(await driver.getCurrentUrl())) {
      return true;
    }
  }

  return false;
}

export async function waitUntilWindowWithUrl(urlRegex) {
  await pWaitFor(() => switchToWindowWithUrl(urlRegex), {
    interval: 500,
  });
}
