/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

const zipdir = require("zip-dir");
const fs = require("fs");
const os = require("os");
const { once } = require("lodash");
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
const getZippedExtensionAsPath = once(async function () {
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

async function runInChrome() {
  if (!isBrowserstack) {
    require("chromedriver");
  }

  // https://www.browserstack.com/automate/capabilities
  const builder = getBuilder();
  builder.withCapabilities({
    browser: "chrome",
    browserName: "chrome",
    browser_version: "latest",
    "bstack:options": {
      os: "Windows",
      osVersion: "10",
    },
    name: "chrome test",
  });

  // Arguments list: https://peter.sh/experiments/chromium-command-line-switches/
  const options = new chrome.Options();
  options.addArguments("auto-open-devtools-for-tabs");
  if (isBrowserstack) {
    options.addExtensions(
      (await getZippedExtensionAsBuffer()).toString("base64")
    );
  } else {
    options.addArguments("load-extension=" + extensionLocation);
  }

  builder.setChromeOptions(options);
  return builder.build();
}

async function runInFirefox() {
  if (!isBrowserstack) {
    require("geckodriver");
  }

  // https://www.browserstack.com/automate/capabilities
  const builder = getBuilder();
  builder.withCapabilities({
    browser: "firefox",
    browserName: "firefox",
    browser_version: "latest",
    "bstack:options": {
      os: "Windows",
      osVersion: "10",
    },
    name: "firefox test",
  });

  const driver = await builder.build();
  await driver.installAddon(await getZippedExtensionAsPath(), true);
  return driver;
}

module.exports = class SeleniumEnvironment extends NodeEnvironment {
  async setup() {
    await super.setup();

    const BROWSER = process.env.BROWSER ?? "chrome";
    console.log(
      "Will test on",
      BROWSER,
      isBrowserstack ? "using Browserstack" : "locally"
    );
    if (BROWSER === "firefox") {
      this.global.__DRIVER__ = await runInFirefox();
    } else if (BROWSER === "chrome") {
      this.global.__DRIVER__ = await runInChrome();
    } else {
      throw new Error("Unrecognized BROWSER env: " + BROWSER);
    }

    this.global.__WEB_DRIVER__ = webdriver;
  }

  async teardown() {
    await super.teardown();
    // The driver might have failed loading altogether, so it might be undefined
    await this.global.__DRIVER__?.quit();
  }
};
