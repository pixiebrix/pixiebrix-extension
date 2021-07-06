/*
 * Copyright (C) 2021 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

const webdriver = require("selenium-webdriver");

const username = process.env.BROWSERSTACK_USERNAME;
const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;

async function runTestWithCaps(capabilities) {
  const driver = new webdriver.Builder()
    .usingServer(
      `https://${username}:${accessKey}@hub-cloud.browserstack.com/wd/hub`
    )
    .withCapabilities({
      ...capabilities,
      // Enable if using local environment
      // 'browserstack.local': 'true',
      ...(capabilities["browser"] && { browserName: capabilities["browser"] }), // Because NodeJS language binding requires browserName to be defined
    })
    .build();
  await driver.get("https://www.pixiebrix.com");
  try {
    await driver.wait(webdriver.until.titleMatches(/pixiebrix/i), 5000);
    console.log(await driver.getTitle());
    await driver.executeScript(
      'browserstack_executor: {"action": "setSessionStatus", "arguments": {"status":"passed","reason": "Title contains PixieBrix!"}}'
    );
  } catch {
    await driver.executeScript(
      'browserstack_executor: {"action": "setSessionStatus", "arguments": {"status":"failed","reason": "Page could not load in time"}}'
    );
  }
  await driver.quit();
}

const capabilities1 = {
  browser: "chrome",
  browser_version: "latest",
  "bstack:options": {
    os: "Windows",
    osVersion: "10",
  },
  build: "browserstack-build-1",
  name: "Parallel test 1",
};
const capabilities2 = {
  browser: "firefox",
  browser_version: "latest",
  "bstack:options": {
    os: "Windows",
    osVersion: "10",
  },
  build: "browserstack-build-1",
  name: "Parallel test 2",
};
const capabilities3 = {
  browser: "safari",
  browser_version: "latest",
  "bstack:options": {
    os: "OS X",
    osVersion: "Big Sur",
  },
  build: "browserstack-build-1",
  name: "Parallel test 3",
};

void runTestWithCaps(capabilities1);
void runTestWithCaps(capabilities2);
void runTestWithCaps(capabilities3);
