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

/**
 * @file THIS FILE IS MEANT TO BE IMPORTED EXCLUSIVELY BY ./api.js
 */

import { linkExtension } from "@/auth/token";
import { type TokenAuthData } from "@/auth/authTypes";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { installStarterBlueprints as installStarterBlueprintsInBackground } from "@/background/messenger/api";
import { type RegistryId } from "@/types/registryTypes";
import reportError from "@/telemetry/reportError";
import { validateRegistryId } from "@/types/helpers";
import { StorageItem } from "webext-storage";
import { getExtensionConsoleUrl } from "@/utils/extensionUtils";
import type { Nullishable } from "@/utils/nullishUtils";
import type { ModOptionsPair } from "@/types/modTypes";

const HACK_EXTENSION_LINK_RELOAD_DELAY_MS = 100;

/**
 * @deprecated superseded by ModOptionsPair[]. Will be dropped in 1.8.9 or later version
 */
type SingleModActivation = RegistryId;

/**
 * @deprecated superseded by ModOptionsPair[]. Will be dropped in 1.8.9 or later version
 */
type MultiModActivation = RegistryId[];

// Type preserving backwards compatibility
type ModActivation =
  | SingleModActivation
  | MultiModActivation
  | ModOptionsPair[];

/**
 * Chrome Storage key for tracking the mod id(s) that PixieBrix should start activation for.
 */
const activationStorage = new StorageItem<ModOptionsPair[]>(
  // Keeping key for backwards compatibility
  "activatingBlueprintId",
);

/**
 * Migrate activation state to latest format. Does not validate the mod ids or options.
 * @param value mod activation state
 */
function migrateActivatingModsShape(
  value: Nullishable<ModActivation>,
): ModOptionsPair[] {
  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    // Legacy support for single mod activation
    return [{ modId: value, initialOptions: {} }];
  }

  if (!Array.isArray(value) || value.length === 0) {
    return [];
  }

  if (typeof value[0] === "string") {
    // Legacy support for multiple mod activation
    return (value as MultiModActivation).map((modId) => ({
      modId,
      initialOptions: {},
    }));
  }

  return value as ModOptionsPair[];
}

/**
 * Set the user's credentials for the PixieBrix extension. Returns true if the data was updated.
 *
 * Reloads the browser extension if the credentials were updated.
 *
 * @param auth the user data and credentials
 * @see linkExtension
 */
export async function setExtensionAuth(auth: TokenAuthData): Promise<boolean> {
  const updated = await linkExtension(auth);
  if (updated) {
    reportEvent(Events.LINK_EXTENSION);
    console.debug(
      `Extension link updated, reloading browser extension in ${HACK_EXTENSION_LINK_RELOAD_DELAY_MS}ms`,
    );

    // A hack to ensure the SET_EXTENSION_AUTH messenger response flows to the front-end before the backend
    // page is reloaded.
    setTimeout(async () => {
      console.debug("Reloading browser extension due to extension link update");
      browser.runtime.reload();
    }, HACK_EXTENSION_LINK_RELOAD_DELAY_MS);
  }

  return updated;
}

type OpenMarketplaceOptions = {
  /**
   * True to open the extension in a new tab, false to replace the current tab (default=True)
   */
  newTab?: boolean;
};

/**
 * Opens the Extension Console marketplace route. NOTE: this is not the public marketplace.
 * @return true
 * @deprecated there's no top-level marketplace route in the Extension Console anymore
 */
export async function openMarketplace({
  newTab = true,
}: OpenMarketplaceOptions): Promise<boolean> {
  const url = getExtensionConsoleUrl("marketplace");

  if (newTab) {
    await browser.tabs.create({ url, active: true });
  } else {
    await browser.tabs.update({ url });
  }

  return true;
}

/**
 * The mod(s) to activate.
 * @deprecated superseded by ActivationPartial
 * @see ActivationPartial
 */
type LegacyModActivationPartial = {
  /**
   * The mods(s) to activate.
   *
   * As of 1.7.35, this can be a single mod or list of mods. But we're keeping the name for backwards compatibility.
   */
  blueprintId: RegistryId | RegistryId[];
};

/**
 * Array of mods to activate.
 * @since 1.8.8
 */
type ModActivationPartial = {
  mods: ModOptionsPair[];
};

/**
 * Set the mod id(s) that PixieBrix should start activation for.
 *
 * @see getActivatingMods
 */
export async function setActivatingMods(
  args: LegacyModActivationPartial | ModActivationPartial,
): Promise<void> {
  const modIdsOrMods =
    (args as ModActivationPartial).mods ??
    (args as LegacyModActivationPartial).blueprintId;

  const mods = migrateActivatingModsShape(modIdsOrMods);

  if (mods.length === 0) {
    await activationStorage.remove();
    return;
  }

  // Defensive check for syntactically valid registry ids
  for (const { modId } of mods) {
    validateRegistryId(modId);
  }

  return activationStorage.set(mods);
}

/**
 * Returns the mod id(s) that PixieBrix should show activation UI for, or null if there are none.
 *
 * @see setActivatingMods
 */
export async function getActivatingMods(): Promise<
  Nullishable<ModOptionsPair[]>
> {
  const value = await activationStorage.get();
  const normalized = migrateActivatingModsShape(value);
  return normalized.length === 0 ? null : normalized;
}

type ActivateModsOptions = (
  | LegacyModActivationPartial
  | ModActivationPartial
) & {
  /**
   * True to open the extension in a new tab, false to replace the current tab (default=True)
   */
  newTab?: boolean;

  /**
   * The "source" page to associate with the activation. This affects the wording in the ActivateWizard
   * component. We used to have multiple sources: template vs. marketplace. However, we got rid of "templates" as a
   * separate pageSource. Keep for now for analytics consistency.
   */
  pageSource?: "marketplace";

  /**
   * The URL to redirect to after activation is complete (if present)
   */
  redirectUrl?: string;
};

/**
 * Open the url for activating a blueprint in a new/existing tab.
 *
 * Opens redirectUrl, otherwise opens the Extension Console activation wizard.
 *
 * @return true
 * @throws Error if no mod ids are provided
 */
export async function openActivateModPage({
  newTab = true,
  redirectUrl,
  ...options
}: ActivateModsOptions): Promise<boolean> {
  const mods = migrateActivatingModsShape(
    (options as ModActivationPartial).mods ??
      (options as LegacyModActivationPartial).blueprintId,
  );

  if (mods.length === 0) {
    throw new Error("No mods provided");
  } else if (redirectUrl == null && mods.length > 1) {
    reportError(
      new Error("No redirectUrl provided for multiple mod activation"),
    );
  }

  const url =
    redirectUrl ??
    // For extension console activation, only support a single mod id
    // TODO: support passing options to the Extension Console activation page
    getExtensionConsoleUrl(
      `marketplace/activate/${encodeURIComponent(mods[0].modId)}`,
    );

  if (newTab) {
    await browser.tabs.create({ url });
  } else {
    await browser.tabs.update({ url });
  }

  return true;
}

/**
 * Open the Extension Console
 * @return true
 */
export async function openExtensionConsole(): Promise<boolean> {
  await browser.runtime.openOptionsPage();
  return true;
}

/**
 * Activate starter mods via the background page.
 * @see installStarterBlueprintsInBackground
 */
export async function activateStarterMods(): Promise<boolean> {
  return installStarterBlueprintsInBackground();
}
