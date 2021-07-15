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

const zipdir = require("zip-dir");
const fs = require("fs");
const webdriver = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const extensionLocation = require("../package.json").webExt.sourceDir;
const path = require("path");

const manifestPath = path.resolve(extensionLocation, "manifest.json");
console.assert(
  fs.existsSync(manifestPath),
  `Extension not found:` + manifestPath
);

const username = process.env.BROWSERSTACK_USERNAME;
const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;

const isBrowserstack = Boolean(username);

if (!isBrowserstack) {
  console.log("Using local Chrome version");
  require("geckodriver");
}

// TODO: install extensions on startup
// Firefox instructions (not verified to work on browserstack): https://stackoverflow.com/questions/7477959/selenium-how-to-start-firefox-with-addons
// Can web-ext package it? https://github.com/mozilla/web-ext/issues/119

// More references:
// https://github.com/applitools/jest-environment-selenium
// https://developer.mozilla.org/en-US/docs/Learn/Tools_and_testing/Cross_browser_testing/Your_own_automation_environment#browserstack
// Using Jest with Selenium: https://www.lambdatest.com/blog/jest-tutorial-for-selenium-javascript-testing-with-examples/
// Open devtools: https://stackoverflow.com/questions/37683576/how-do-you-automatically-open-the-chrome-devtools-tab-within-selenium-c

async function testPixieBrixHomepage(driver) {
  await driver.get("https://www.pixiebrix.com");
  try {
    await driver.wait(webdriver.until.titleMatches(/pixiebrix/i), 5000);
    console.log(await driver.getTitle());
    await driver.executeScript('console.log("sdasd")');
  } catch {
    await driver.executeScript('console.log("error")');
  }
}

function getBuilder() {
  const builder = new webdriver.Builder();
  if (isBrowserstack) {
    builder.usingServer(
      `https://${username}:${accessKey}@hub-cloud.browserstack.com/wd/hub`
    );
  }

  return builder;
}

let zippedExtension;
async function getZippedExtensionAsBuffer() {
  if (!zippedExtension) {
    console.log(`Will zip extension`);
    zippedExtension = await zipdir(extensionLocation);
    console.log(
      `Zipped extension weighs ${Math.round(
        (Buffer.byteLength(zippedExtension) / 1024 / 1024) * 1.3
      )} MB`
    );
  }

  return zippedExtension;
}

async function getChromeOptions() {
  require("chromedriver");
  const chromeOptions = new chrome.Options();
  chromeOptions.addArguments("auto-open-devtools-for-tabs");
  if (isBrowserstack) {
    chromeOptions.setOptions({
      extensions: [await getZippedExtensionAsBuffer()],
    });
  } else {
    chromeOptions.addArguments("load-extension=" + extensionLocation);
  }
  return chromeOptions;
}

const configurations = new Map();
configurations.set("chrome", {
  browser: "chrome",
  browserName: "chrome",
  browser_version: "latest",
  "bstack:options": {
    os: "Windows",
    osVersion: "10",
  },
  name: "chrome test",
});

async function init() {
  for (const [browser, configuration] of configurations) {
    const builder = getBuilder();
    builder.withCapabilities(configuration);
    if (browser === "chrome") {
      builder.setChromeOptions(getChromeOptions());
    }

    const driver = await builder.build();
    await testPixieBrixHomepage(driver);
    await driver.quit();
  }
}

void init();
