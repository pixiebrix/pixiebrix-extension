/*
 * Copyright (C) 2020 Pixie Brix, LLC
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

import { browser, Runtime } from "webextension-polyfill-ts";
import { reportError } from "@/telemetry/logging";
import { liftBackground } from "@/background/protocol";
import urljoin from "url-join";
import { reportEvent, initTelemetry } from "@/telemetry/telemetry";

const SERVICE_URL = process.env.SERVICE_URL;

async function openInstallPage() {
  await browser.runtime.openOptionsPage();
}

function install({ reason }: Runtime.OnInstalledDetailsType) {
  if (reason === "install") {
    openInstallPage().catch((reason) => {
      reportError(reason);
    });
    initTelemetry();
    reportEvent("PixieBrixInstall", {
      version: browser.runtime.getManifest().version,
    });
  } else if (reason === "update") {
    initTelemetry();
    reportEvent("PixieBrixUpdate", {
      version: browser.runtime.getManifest().version,
    });
  }
}

function init() {
  initTelemetry();
}

export const hasAppAccount = liftBackground("CHECK_APP_ACCOUNT", async () => {
  const tabs = await browser.tabs.query({ url: urljoin(SERVICE_URL, "setup") });
  return tabs.length > 0;
});

browser.runtime.onInstalled.addListener(install);
browser.runtime.onStartup.addListener(init);
