/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { browser, Runtime } from "webextension-polyfill-ts";
import { liftBackground } from "@/background/protocol";
import { reportEvent, initTelemetry } from "@/telemetry/events";
import { DNT_STORAGE_KEY, getDNT, getUID } from "@/background/telemetry";

const UNINSTALL_URL = "https://www.pixiebrix.com/uninstall/";

let _availableVersion: string | null = null;

async function openInstallPage() {
  await browser.runtime.openOptionsPage();
}

function install({ reason }: Runtime.OnInstalledDetailsType) {
  if (reason === "install") {
    void openInstallPage();
    reportEvent("PixieBrixInstall", {
      version: browser.runtime.getManifest().version,
    });
  } else if (reason === "update") {
    reportEvent("PixieBrixUpdate", {
      version: browser.runtime.getManifest().version,
    });
  }
}

function onUpdateAvailable({ version }: Runtime.OnUpdateAvailableDetailsType) {
  _availableVersion = version;
}

export const getAvailableVersion = liftBackground(
  "GET_AVAILABLE_VERSION",
  async () => ({
    installed: browser.runtime.getManifest().version,
    available: _availableVersion,
  })
);

async function setUninstallURL(): Promise<void> {
  if (await getDNT()) {
    // We still want to show the uninstall page so the user can optionally fill out the uninstall form. Also,
    // Chrome reports an error if no argument is passed in
    await browser.runtime.setUninstallURL(UNINSTALL_URL);
  } else {
    const url = new URL(UNINSTALL_URL);
    url.searchParams.set("uid", await getUID());
    await browser.runtime.setUninstallURL(url.toString());
  }
}

browser.runtime.onUpdateAvailable.addListener(onUpdateAvailable);
browser.runtime.onInstalled.addListener(install);
browser.runtime.onStartup.addListener(initTelemetry);

browser.storage.onChanged.addListener((changes) => {
  if (DNT_STORAGE_KEY in changes) {
    void setUninstallURL();
  }
});

void setUninstallURL();
