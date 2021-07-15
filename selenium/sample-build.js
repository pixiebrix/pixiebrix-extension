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
const os = require("os");
const onetime = require("onetime");
const webdriver = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const firefox = require("selenium-webdriver/firefox");
const extensionLocation = require("../package.json").webExt.sourceDir;
const path = require("path");

const useFirefox = process.argv.includes("--firefox");
const useChrome = process.argv.includes("--chrome");

const manifestPath = path.resolve(extensionLocation, "manifest.json");
console.assert(
  fs.existsSync(manifestPath),
  `Extension not found:` + manifestPath
);

const username = process.env.BROWSERSTACK_USERNAME;
const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;

const isBrowserstack = Boolean(username);

if (!isBrowserstack) {
  console.log("Using local WebDriver");
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

const getZippedExtensionAsPath = onetime(async function () {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "pixie-"));
  const tempZippedFile = path.join(tempDirectory, "extension.zip");
  console.log("Storing zip in", tempZippedFile);
  await fs.promises.writeFile(
    tempZippedFile,
    await getZippedExtensionAsBuffer()
  );
  return tempZippedFile;
});

const getZippedExtensionAsBuffer = onetime(async function () {
  console.log(`Will zip extension`);
  const zippedExtension = await zipdir(extensionLocation);

  console.log(
    `Zipped extension weighs ${Math.round(
      (Buffer.byteLength(zippedExtension) / 1024 / 1024) * 1.3
    )} MB`
  );
  return zippedExtension;
});

async function getChromeOptions() {
  const options = new chrome.Options();
  options.addArguments("auto-open-devtools-for-tabs");
  if (isBrowserstack) {
    options.setOptions({
      extensions: [await getZippedExtensionAsBuffer()],
    });
  } else {
    options.addArguments("load-extension=" + extensionLocation);
  }
  return options;
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
configurations.set("firefox", {
  browser: "firefox",
  browserName: "firefox",
  browser_version: "latest",
  "bstack:options": {
    os: "Windows",
    osVersion: "10",
  },
  name: "firefox test",
});

async function runInBrowser(browser) {
  const builder = getBuilder();
  builder.withCapabilities(configurations.get(browser));
  if (browser === "chrome") {
    require("chromedriver");
    builder.setChromeOptions(getChromeOptions());
  }
  if (browser === "firefox") {
    require("geckodriver");
  }

  const driver = await builder.build();
  if (browser === "firefox") {
    await driver.installAddon(await getZippedExtensionAsPath());
  }
  await testPixieBrixHomepage(driver);
  await driver.quit();
}

if (useChrome) {
  void runInBrowser("chrome");
}

if (useFirefox) {
  void runInBrowser("firefox");
}
