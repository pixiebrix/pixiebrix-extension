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

import { Runtime } from "webextension-polyfill";
import { reportEvent } from "@/telemetry/events";
import { initTelemetry } from "@/background/telemetry";
import { getUID } from "@/background/messenger/api";
import { DNT_STORAGE_KEY, allowsTrack } from "@/telemetry/dnt";
import { gt } from "semver";
import { getBaseURL } from "@/services/baseService";
import { isLinked } from "@/auth/token";
import { isCommunityControlRoom } from "@/contrib/automationanywhere/aaUtils";
import { isEmpty } from "lodash";

const UNINSTALL_URL = "https://www.pixiebrix.com/uninstall/";

// eslint-disable-next-line prefer-destructuring -- It breaks EnvironmentPlugin
const SERVICE_URL = process.env.SERVICE_URL;

/**
 * The latest version of PixieBrix available in the Chrome Web Store, or null if the version hasn't been fetched.
 */
let _availableVersion: string | null = null;

/**
 * Install handler to complete authentication configuration for the extension.
 */
export async function openInstallPage() {
  // Look for an Admin Console tab that's showing an onboarding page
  // /setup: normal onboarding screen
  // /start: partner onboarding
  const [appBaseUrl, [appOnboardingTab]] = await Promise.all([
    getBaseURL(),
    browser.tabs.query({
      url: [
        new URL("setup", SERVICE_URL).href,
        `${new URL("start", SERVICE_URL).href}?*`,
      ],
    }),
  ]);

  // There are 4 cases:
  // Case 1a: there's a partner onboarding tab showing an enterprise onboarding flow
  // Case 1b: there's a partner onboarding tab showing a community onboarding flow
  // Case 2: there's a native onboarding tab
  // Case 3: there's no Admin Console onboarding tab open

  if (appOnboardingTab) {
    const appOnboardingTabUrl = new URL(appOnboardingTab.url);

    if (appOnboardingTabUrl.pathname === "/start") {
      // Case 1a/1b: Admin Console is showing a partner onboarding flow

      const controlRoomHostname =
        appOnboardingTabUrl.searchParams.get("hostname");

      if (
        !isEmpty(controlRoomHostname) &&
        !isCommunityControlRoom(controlRoomHostname)
      ) {
        // Case 1a: Admin Console is showing enterprise onboarding flow
        //
        // Show the Extension Console /start page, where the user will be prompted to use OAuth2 to connect their
        // AARI account. Include the Control Room hostname in the URL so that the ControlRoomOAuthForm can pre-fill
        // the URL
        const extensionStartUrl = new URL(
          browser.runtime.getURL("options.html")
        );
        extensionStartUrl.hash = `/start${appOnboardingTabUrl.search}`;

        await browser.tabs.update(appOnboardingTab.id, {
          url: extensionStartUrl.href,
          active: true,
        });

        return;
      }

      // Case 1b: Admin Console is showing community onboarding flow
      //
      // Redirect to the main Admin Console page, which automatically "links" the extension (by passing the PixieBrix
      // token to the extension).
      //
      // When the extension is linked, the extension reloads itself. On restart, it will automatically show the
      // screen to configure the required AA integration.
      //
      // Reuse the tab that is part of the Admin Console onboarding flow to avoid multiple PixieBrix tabs.
      // See discussion here: https://github.com/pixiebrix/pixiebrix-extension/pull/3506
      await browser.tabs.update(appOnboardingTab.id, { url: appBaseUrl });

      return;
    }

    // Case 2: the Admin Console is showing the native PixieBrix onboarding tab.
    //
    // Redirect to the main Admin Console page, which automatically "links" the extension (by passing the PixieBrix
    // token to the extension).
    //
    // Reuse the tab that is part of the Admin Console onboarding flow to avoid multiple PixieBrix tabs.
    // See discussion here: https://github.com/pixiebrix/pixiebrix-extension/pull/3506
    await browser.tabs.update(appOnboardingTab.id, { url: appBaseUrl });
  } else {
    // Case 3: there's no Admin Console onboarding tab open
    //
    // Open a new Admin Console tab which will automatically "links" the extension (by passing the native PixieBrix
    // token to the extension).
    await browser.tabs.create({ url: appBaseUrl });
  }
}

async function install({ reason }: Runtime.OnInstalledDetailsType) {
  if (reason === "install") {
    reportEvent("PixieBrixInstall", {
      version: browser.runtime.getManifest().version,
    });
    if (!(await isLinked())) {
      void openInstallPage();
    }
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
