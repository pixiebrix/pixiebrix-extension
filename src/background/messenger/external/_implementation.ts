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

import { linkExtension } from "@/auth/authStorage";
import { type TokenAuthData } from "@/auth/authTypes";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { activateWelcomeModsInBackground } from "@/background/messenger/api";
import reportError from "@/telemetry/reportError";
import { validateRegistryId } from "@/types/helpers";
import { StorageItem } from "webext-storage";
import { getExtensionConsoleUrl } from "@/utils/extensionUtils";
import type { Nullishable } from "@/utils/nullishUtils";
import type { ModActivationConfig } from "@/types/modTypes";
import { type ActivateModsResult } from "@/background/starterMods";

const HACK_EXTENSION_LINK_RELOAD_DELAY_MS = 100;

/**
 * Chrome Storage key for tracking the mod id(s) that PixieBrix should start activation for.
 */
const activationStorage = new StorageItem<ModActivationConfig[] | null>(
  // Keeping key for backwards compatibility
  "activatingBlueprintId",
  { defaultValue: [] },
);

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
 * @returns true
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
 * Array of mods to activate.
 * @since 1.8.8
 */
type ModActivationPartial = {
  mods: ModActivationConfig[];
};

/**
 * Set the mod id(s) that PixieBrix should start activation for. Pass a nullish value to clear the activation state.
 *
 * @throws Error if any mod id is not a valid registry id
 * @see getActivatingMods
 */
export async function setActivatingMods(
  args: Nullishable<ModActivationPartial>,
): Promise<void> {
  if (args == null) {
    await activationStorage.remove();
    return;
  }

  const { mods } = args;

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
 * Returns the mod id(s) that PixieBrix should show activation UI for.
 *
 * @see setActivatingMods
 */
export async function getActivatingMods(): Promise<
  ModActivationConfig[] | null
> {
  return activationStorage.get();
}

type ActivateModsOptions = ModActivationPartial & {
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
 * @returns true
 * @throws Error if no mod ids are provided
 */
export async function openActivateModPage({
  newTab = true,
  redirectUrl,
  ...options
}: ActivateModsOptions): Promise<boolean> {
  const { mods } = options;

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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- length check above
      `marketplace/activate/${encodeURIComponent(mods[0]!.modId)}`,
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
 */
export async function openExtensionConsole(): Promise<true> {
  await browser.runtime.openOptionsPage();
  return true;
}

/**
 * Activate welcome mods via the background page.
 * @see activateWelcomeModsInBackground
 */
export async function activateWelcomeMods(): Promise<
  ActivateModsResult | undefined
> {
  return activateWelcomeModsInBackground();
}
