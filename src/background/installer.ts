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
import { reportEvent, initTelemetry } from "@/telemetry/events";
import { DNT_STORAGE_KEY, getDNT, getUID } from "@/background/telemetry";

const SERVICE_URL = process.env.SERVICE_URL;

let _availableVersion: string | null = null;

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

function onUpdateAvailable({ version }: Runtime.OnUpdateAvailableDetailsType) {
  _availableVersion = version;
}

function init() {
  initTelemetry();
}

export const hasAppAccount = liftBackground("CHECK_APP_ACCOUNT", async () => {
  const tabs = await browser.tabs.query({ url: urljoin(SERVICE_URL, "setup") });
  return tabs.length > 0 ? { id: tabs[0].id } : null;
});

export const getAvailableVersion = liftBackground(
  "GET_AVAILABLE_VERSION",
  async () => {
    return {
      installed: browser.runtime.getManifest().version,
      available: _availableVersion,
    };
  }
);

async function setUninstallURL(): Promise<void> {
  if (await getDNT()) {
    await browser.runtime.setUninstallURL();
  } else {
    const url = new URL("https://www.pixiebrix.com/uninstall/");
    url.searchParams.set("uid", await getUID());
    await browser.runtime.setUninstallURL(url.toString());
  }
}

browser.runtime.onUpdateAvailable.addListener(onUpdateAvailable);
browser.runtime.onInstalled.addListener(install);
browser.runtime.onStartup.addListener(init);

browser.storage.onChanged.addListener((changes) => {
  if (DNT_STORAGE_KEY in changes) {
    void setUninstallURL();
  }
});

setUninstallURL();
