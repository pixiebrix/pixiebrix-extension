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
const extensionLocation = require("../package.json").webExt.sourceDir;
const path = require("path");
const NodeEnvironment = require("jest-environment-node");

const manifestPath = path.resolve(extensionLocation, "manifest.json");
fs.readFileSync(manifestPath); // Existence check with automatic ENOENT error

const username = process.env.BROWSERSTACK_USERNAME;
const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;

const isBrowserstack = Boolean(username);
if (isBrowserstack) {
  console.log("Using Browserstack");
} else {
  console.log("Using local WebDriver");
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

// Only paths are accepted in Firefox
// https://github.com/SeleniumHQ/selenium/issues/8357
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

// Arguments list: https://peter.sh/experiments/chromium-command-line-switches/
async function getChromeOptions() {
  const options = new chrome.Options();
  options.addArguments("auto-open-devtools-for-tabs");
  if (isBrowserstack) {
    options.addExtensions(
      (await getZippedExtensionAsBuffer()).toString("base64")
    );
  } else {
    options.addArguments("load-extension=" + extensionLocation);
  }
  return options;
}

// https://www.browserstack.com/automate/capabilities
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
    builder.setChromeOptions(await getChromeOptions());
  }
  if (browser === "firefox") {
    require("geckodriver");
  }

  const driver = await builder.build();
  if (browser === "firefox") {
    await driver.installAddon(await getZippedExtensionAsPath(), true);
  }
  return driver;
}

module.exports = class SeleniumEnvironment extends NodeEnvironment {
  async setup() {
    await super.setup();
    this.global.__DRIVER__ = await runInBrowser("chrome");
    this.global.__WEB_DRIVER__ = webdriver;
  }

  async teardown() {
    await super.teardown();
    // The driver might have failed loading altogether, so it might be undefined
    await this.global.__DRIVER__?.quit();
  }
};
