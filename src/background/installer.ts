/* eslint-disable filenames/match-exported */
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

import browser, { Runtime } from "webextension-polyfill";
import { reportEvent } from "@/telemetry/events";
import { getUID, initTelemetry } from "@/background/telemetry";
import { DNT_STORAGE_KEY, allowsTrack } from "@/telemetry/dnt";
import { gt } from "semver";

const UNINSTALL_URL = "https://www.pixiebrix.com/uninstall/";

/**
 * The latest version of PixieBrix available in the Chrome Web Store, or null if the version hasn't been fetched.
 */
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

export function getAvailableVersion(): typeof _availableVersion {
  return _availableVersion;
}

/**
 * Return true if the extension has checked for updates and an update is available.
 */
export function isUpdateAvailable(): boolean {
  const available = getAvailableVersion();
  const installed = browser.runtime.getManifest().version;
  return (
    Boolean(available) && installed !== available && gt(available, installed)
  );
}

async function setUninstallURL(): Promise<void> {
  const url = new URL(UNINSTALL_URL);
  if (await allowsTrack()) {
    url.searchParams.set("uid", await getUID());
  }

  // We always want to show the uninstallation page so the user can optionally fill out the uninstallation form
  await browser.runtime.setUninstallURL(url.href);
}

function initInstaller() {
  browser.runtime.onUpdateAvailable.addListener(onUpdateAvailable);
  browser.runtime.onInstalled.addListener(install);
  browser.runtime.onStartup.addListener(initTelemetry);

  browser.storage.onChanged.addListener((changes) => {
    if (DNT_STORAGE_KEY in changes) {
      void setUninstallURL();
    }
  });

  void setUninstallURL();
}

export default initInstaller;
