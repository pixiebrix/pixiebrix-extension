/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { integrationConfigLocator as serviceLocator } from "@/background/integrationConfigLocator";
import { type Runtime } from "webextension-polyfill";
import { initTelemetry, recordEvent } from "@/background/telemetry";
import { getUUID } from "@/telemetry/telemetryHelpers";
import { allowsTrack, dntConfig } from "@/telemetry/dnt";
import { gt } from "semver";
import { getBaseURL } from "@/data/service/baseService";
import { getExtensionToken, getUserData, isLinked } from "@/auth/authStorage";
import { isCommunityControlRoom } from "@/contrib/automationanywhere/aaUtils";
import { isEmpty } from "lodash";
import { expectContext } from "@/utils/expectContext";
import {
  initManagedStorage,
  isInitialized as isManagedStorageInitialized,
  readManagedStorage,
  resetInitializationTimestamp as resetManagedStorageInitializationState,
  watchForDelayedStorageInitialization,
} from "@/store/enterprise/managedStorage";
import { Events } from "@/telemetry/events";
import { DEFAULT_SERVICE_URL, UNINSTALL_URL } from "@/urlConstants";
import { CONTROL_ROOM_TOKEN_INTEGRATION_ID } from "@/integrations/constants";
import {
  getExtensionConsoleUrl,
  getExtensionVersion,
} from "@/utils/extensionUtils";
import { oncePerSession } from "@/mv3/SessionStorage";
import { resetFeatureFlagsCache } from "@/auth/featureFlagStorage";
import { normalizeSemVerString } from "@/types/helpers";
import { type SemVerString } from "@/types/registryTypes";

/**
 * The latest version of PixieBrix available in the Chrome Web Store, or null if the version hasn't been fetched.
 */
let _availableVersion: string | null = null;

/**
 * Returns true if this appears to be a Chrome Web Store install and/or the user has an app URL where they're
 * authenticated so the extension can be linked.
 */
async function isLikelyEndUserInstall(): Promise<boolean> {
  // Query existing app/CWS tabs: https://developer.chrome.com/docs/extensions/reference/api/tabs#method-query
  // `browser.tabs.query` supports https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns
  const likelyOnboardingTabs = await browser.tabs.query({
    // Can't use SERVICE_URL directly because it contains a port number during development, resulting in an
    // invalid URL match pattern
    url: [
      // Setup page is page before sending user to the CWS
      new URL("setup", DEFAULT_SERVICE_URL).href,
      // Base page is extension linking page. Needs path to be a valid URL match pattern
      new URL("", DEFAULT_SERVICE_URL).href,
      // Known CWS URLs: https://docs.pixiebrix.com/enterprise-it-setup/network-email-firewall-configuration
      "https://chromewebstore.google.com/*",
      "https://chrome.google.com/webstore/*",
    ],
  });

  // The CWS install URL differs based on the extension listing slug. So instead, only match on the runtime id.
  return likelyOnboardingTabs.some(
    (tab) =>
      tab.url?.includes(DEFAULT_SERVICE_URL) ||
      tab.url?.includes(browser.runtime.id),
  );
}

/**
 * Install handler to complete authentication configuration for the extension.
 * @internal
 */
export async function openInstallPage() {
  expectContext("background");

  // Look for an Admin Console tab that's showing an onboarding page
  // /setup: normal onboarding screen
  // /start: partner onboarding
  const [appBaseUrl, [appOnboardingTab]] = await Promise.all([
    getBaseURL(),
    browser.tabs.query({
      // Can't use SERVICE_URL directly because it contains a port number during development, resulting in an
      // invalid URL match pattern
      url: [
        new URL("setup", DEFAULT_SERVICE_URL).href,
        `${new URL("start", DEFAULT_SERVICE_URL).href}?*`,
      ],
    }),
  ]);

  // There are 4 cases:
  // Case 1a: there's an Admin Console partner onboarding tab showing an enterprise onboarding flow (/start)
  // Case 1b: there's an Admin Console partner onboarding tab showing a community onboarding flow (/start)
  // Case 2: there's an Admin Console native onboarding tab (/setup)
  // Case 3: there's no Admin Console onboarding tab open

  if (appOnboardingTab) {
    const appOnboardingTabUrl = appOnboardingTab?.url
      ? new URL(appOnboardingTab.url)
      : null;

    if (appOnboardingTabUrl?.pathname === "/start") {
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
        // AA Automation Business Co-Pilot account (formerly called AARI). Include the Control Room hostname in the
        // URL so that the ControlRoomOAuthForm can pre-fill the URL
        const extensionStartUrl = getExtensionConsoleUrl(
          `start${appOnboardingTabUrl.search}`,
        );

        await browser.tabs.update(appOnboardingTab.id, {
          url: extensionStartUrl,
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
      // screen to configure the required AA integration. See installer:checkPartnerAuth below
      //
      // Reuse the tab that is part of the Admin Console onboarding flow to avoid multiple PixieBrix tabs.
      // See discussion here: https://github.com/pixiebrix/pixiebrix-extension/pull/3506
      await browser.tabs.update(appOnboardingTab.id, {
        url: appBaseUrl,
        active: true,
      });

      return;
    }

    // Case 2: the Admin Console is showing the native PixieBrix onboarding tab.
    //
    // Redirect to the main Admin Console page, which automatically "links" the extension (by passing the PixieBrix
    // token to the extension).
    //
    // Reuse the tab that is part of the Admin Console onboarding flow to avoid multiple PixieBrix tabs.
    // See discussion here: https://github.com/pixiebrix/pixiebrix-extension/pull/3506
    await browser.tabs.update(appOnboardingTab.id, {
      url: appBaseUrl,
      active: true,
    });
  } else {
    // Case 3: there's no Admin Console onboarding tab open.
    //
    // Open a new Admin Console tab which will automatically "links" the extension (by passing the native PixieBrix
    // token to the extension).
    await browser.tabs.create({ url: appBaseUrl });
  }
}

/**
 * For partner installs, if a partner integration is not configured, automatically open the Extension Console
 * to continue the partner authentication onboarding flow.
 *
 * @see useRequiredPartnerAuth
 * @internal
 */
export async function requirePartnerAuth(): Promise<void> {
  expectContext("background");

  // Check for partner community edition install, where the extension is linked with the native PixieBrix token, but
  // the partner integration is not configured yet.
  //
  // Use getExtensionToken instead of isLinked, because isLinked returns true for partner JWT also
  if (!isEmpty(await getExtensionToken())) {
    const userData = await getUserData();

    console.debug("requirePartnerAuth", userData);

    if (userData.partner?.partnerTheme === "automation-anywhere") {
      const configs =
        await serviceLocator.findAllSanitizedConfigsForIntegration(
          CONTROL_ROOM_TOKEN_INTEGRATION_ID,
        );

      if (!configs.some((x) => !x.proxy)) {
        const extensionConsoleUrl = getExtensionConsoleUrl();

        // Replace the Admin Console tab, if available. The Admin Console tab will be available during openInstallPage
        const [adminConsoleTab] = await browser.tabs.query({
          // Can't use SERVICE_URL directly because it contains a port number during development, resulting in an
          // invalid URL match pattern
          url: [new URL(DEFAULT_SERVICE_URL).href],
        });

        if (adminConsoleTab) {
          await browser.tabs.update(adminConsoleTab.id, {
            url: extensionConsoleUrl,
            active: true,
          });
        } else {
          await browser.tabs.create({ url: extensionConsoleUrl });
        }
      }
    }
  }
}

/** @internal */
export async function showInstallPage({
  reason,
  previousVersion,
}: Runtime.OnInstalledDetailsType): Promise<void> {
  // https://developer.chrome.com/docs/extensions/reference/runtime/#event-onInstalled
  // https://developer.chrome.com/docs/extensions/reference/runtime/#type-OnInstalledReason
  console.debug("onInstalled", { reason, previousVersion });
  const version = getExtensionVersion();

  if (reason === "install") {
    void recordEvent({
      event: Events.PIXIEBRIX_INSTALL,
      data: {
        version,
      },
    });

    // XXX: under what conditions could onInstalled fire, but the extension is already linked? Is this the case during
    // development/loading an update of the extension from the file system?
    if (!(await isLinked())) {
      // If an end-user appears to be installing, jump to linking directly vs. waiting for readManagedStorage because
      // readManagedStorage will wait until a timeout for managed storage to be available.
      if (!isManagedStorageInitialized() && (await isLikelyEndUserInstall())) {
        console.debug("Skipping readManagedStorage for end-user install");

        await openInstallPage();
        return;
      }

      // Reminder: readManagedStorage waits up to 4.5 seconds for managed storage to be available
      const {
        ssoUrl,
        partnerId,
        controlRoomUrl,
        disableLoginTab,
        managedOrganizationId,
      } = await readManagedStorage();

      if (disableLoginTab) {
        // IT manager has disabled the login tab
        return;
      }

      if (ssoUrl || managedOrganizationId) {
        // Don't launch the page automatically. The SSO flow will be launched by deploymentUpdater.ts:updateDeployments
        return;
      }

      if (partnerId === "automation-anywhere" && isEmpty(controlRoomUrl)) {
        // Don't launch the installation page automatically if only the partner id is specified
        return;
      }

      await openInstallPage();
    }
  } else if (reason === "update") {
    // `update` is also triggered on browser.runtime.reload() and manually reloading from the extensions page
    void requirePartnerAuth();

    if (version === previousVersion) {
      void recordEvent({
        event: Events.PIXIEBRIX_RELOAD,
        data: {
          version,
        },
      });
    } else {
      void recordEvent({
        event: Events.PIXIEBRIX_UPDATE,
        data: {
          version,
          previousVersion,
        },
      });
    }
  }
}

/** @internal */
export function setAvailableVersion({
  version,
}: Runtime.OnUpdateAvailableDetailsType): void {
  _availableVersion = version;
}

export function getAvailableVersion(): SemVerString | null {
  if (!_availableVersion) {
    return null;
  }

  return normalizeSemVerString(_availableVersion, { coerce: true });
}

/**
 * Return true if the extension has checked for updates and an update is available.
 */
export function isUpdateAvailable(): boolean {
  const available = getAvailableVersion();

  if (!available) {
    return false;
  }

  const installed = getExtensionVersion();
  return installed !== available && gt(available, installed);
}

async function setUninstallURL(): Promise<void> {
  const url = new URL(UNINSTALL_URL);
  if (await allowsTrack()) {
    url.searchParams.set("uid", await getUUID());
  }

  // We always want to show the uninstallation page so the user can optionally fill out the uninstallation survey
  await browser.runtime.setUninstallURL(url.href);
}

// Using our own session value vs. webext-events because onExtensionStart has a 100ms delay
// https://github.com/fregante/webext-events/blob/main/source/on-extension-start.ts#L56
// eslint-disable-next-line local-rules/persistBackgroundData -- using SessionMap via oncePerSession
const initManagedStorageOncePerSession = oncePerSession(
  "initManagedStorage",
  import.meta.url,
  async () => {
    await resetManagedStorageInitializationState();
    await initManagedStorage();
    void watchForDelayedStorageInitialization();
  },
);

// eslint-disable-next-line local-rules/persistBackgroundData -- using SessionMap via oncePerSession
const initTelemetryOncePerSession = oncePerSession(
  "initTelemetry",
  import.meta.url,
  async () => {
    if (await isLinked()) {
      // Init telemetry is a no-op if not linked. So calling without being linked just delays the throttle
      await initTelemetry();
    }
  },
);

// eslint-disable-next-line local-rules/persistBackgroundData -- using SessionMap via oncePerSession
const updateFlagsOncePerSession = oncePerSession(
  "resetFeatureFlags",
  import.meta.url,
  resetFeatureFlagsCache,
);

function initInstaller(): void {
  void initManagedStorageOncePerSession();
  void initTelemetryOncePerSession();
  void updateFlagsOncePerSession();

  browser.runtime.onInstalled.addListener(showInstallPage);
  browser.runtime.onUpdateAvailable.addListener(setAvailableVersion);

  dntConfig.onChanged(() => {
    void setUninstallURL();
  });

  void setUninstallURL();
}

export default initInstaller;
