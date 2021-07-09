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
const chrome = require("selenium-webdriver/chrome");
const username = process.env.BROWSERSTACK_USERNAME;
const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;

if (!username) {
  console.log("Using local Chrome version");
  require("chromedriver");
}

// TODO: install extensions on startup
// Chrome instructions: https://www.browserstack.com/docs/automate/selenium/add-plugins-extensions-remote-browsers#nodejs
// Firefox instructions (not verified to work on browserstack): https://stackoverflow.com/questions/7477959/selenium-how-to-start-firefox-with-addons
// Can web-ext package it? https://github.com/mozilla/web-ext/issues/119

// More references:
// https://github.com/applitools/jest-environment-selenium
// https://developer.mozilla.org/en-US/docs/Learn/Tools_and_testing/Cross_browser_testing/Your_own_automation_environment#browserstack
// Using Jest with Selenium: https://www.lambdatest.com/blog/jest-tutorial-for-selenium-javascript-testing-with-examples/
// Open devtools: https://stackoverflow.com/questions/37683576/how-do-you-automatically-open-the-chrome-devtools-tab-within-selenium-c

async function testPixieBrixHomepage(capabilities) {
  const builder = new webdriver.Builder();
  if (username) {
    builder.usingServer(
      `https://${username}:${accessKey}@hub-cloud.browserstack.com/wd/hub`
    );
  }
  builder.withCapabilities({
    ...capabilities,
    // Enable if using local environment
    // 'browserstack.local': 'true',
    ...(capabilities["browser"] && { browserName: capabilities["browser"] }), // Because NodeJS language binding requires browserName to be defined
  });

  builder.setChromeOptions(
    new chrome.Options().addArguments("load-extension=browsers/dist")
  );
  const driver = await builder.build();
  await driver.get("https://www.pixiebrix.com");
  try {
    await driver.wait(webdriver.until.titleMatches(/pixiebrix/i), 5000);
    console.log(await driver.getTitle());
    await driver.executeScript('console.log("sdasd")');
  } catch {
    await driver.executeScript('console.log("error")');
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
  name: "Chrome test",
};

void testPixieBrixHomepage(capabilities1);
