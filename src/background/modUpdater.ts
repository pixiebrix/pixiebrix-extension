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

import type { Me } from "@/types/contract";
import { maybeGetLinkedApiClient } from "@/services/apiClient";
import reportError from "@/telemetry/reportError";
import { loadOptions, saveOptions } from "@/store/extensionsStorage";
import type { IExtension, UnresolvedExtension } from "@/types/extensionTypes";
import type { RegistryId, SemVerString } from "@/types/registryTypes";
import type { ModDefinition } from "@/types/modDefinitionTypes";
import type { ExtensionOptionsState } from "@/store/extensionsTypes";
import { selectExtensionsForRecipe } from "@/store/extensionsSelectors";
import extensionsSlice from "@/store/extensionsSlice";
import type { UUID } from "@/types/stringTypes";
import type { OptionsArgs } from "@/types/runtimeTypes";
import { isEmpty } from "lodash";
import { forEachTab } from "@/background/activeTab";
import { queueReactivateTab } from "@/contentScript/messenger/api";

// TODO: replace me
//  const UPDATE_INTERVAL_MS = 10 * 60 * 1000;
const UPDATE_INTERVAL_MS = 60 * 1000;

// TODO: we should consider start extracting this request pattern into an api of some
//  kind that the background script can use
export async function autoModUpdatesEnabled(): Promise<boolean> {
  const client = await maybeGetLinkedApiClient();
  if (client == null) {
    console.debug(
      "Skipping automatic mod updates because the extension is not linked to the PixieBrix service"
    );
    return false;
  }

  try {
    const { data: profile } = await client.get<Me>("/api/me/");

    return profile.flags.includes("automatic-mod-updates");
  } catch (error) {
    console.debug(
      "Skipping automatic mod updates because /api/me/ request failed"
    );
    reportError(error);
    return false;
  }
}

export function collectModVersions(
  mods: Array<IExtension["_recipe"]>
): Record<RegistryId, SemVerString> {
  const modVersions: Record<RegistryId, SemVerString> = {};

  for (const { id, version } of mods) {
    // eslint-disable-next-line security/detect-object-injection -- id is a registry id
    if (modVersions[id] && modVersions[id] !== version) {
      reportError(
        new Error(
          `Found two different mod versions activated for the same mod: ${id} (${modVersions[id]}, ${version}).`
        )
      );
    }

    // eslint-disable-next-line security/detect-object-injection -- id is a registry id
    modVersions[id] = version;
  }

  return modVersions;
}

export async function getActivatedMarketplaceModMetadata(): Promise<
  Array<IExtension["_recipe"]>
> {
  const { extensions: activatedModComponents } = await loadOptions();

  // Typically most Marketplace mods would not be a deployment. If this happens to be the case,
  // the deployment updater will handle the updates.
  return activatedModComponents
    .filter((mod) => mod._recipe?.sharing?.public && !mod._deployment)
    .map((mod) => mod._recipe);
  // TODO: maybe get rid of the _recipe part and just return the whole mod component 👆
}

export async function fetchModUpdates(
  activatedMods: Array<IExtension["_recipe"]>
) {
  const client = await maybeGetLinkedApiClient();
  if (client == null) {
    console.debug(
      "Skipping automatic mod updates because the extension is not linked to the PixieBrix service"
    );
    return {};
  }

  try {
    const {
      data: { updates },
    } = await client.post<{
      updates: Record<
        RegistryId,
        {
          backwards_compatible: ModDefinition;
          backwards_incompatible: boolean;
        }
      >;
    }>("/api/registry/updates/", {
      versions: collectModVersions(activatedMods),
    });
    console.log("*** updates", updates);

    return updates;
  } catch (error) {
    reportError(error);
    return {};
  }
}

async function getBackwardsCompatibleUpdates(
  activatedMods: Array<IExtension["_recipe"]>
): Promise<Record<RegistryId, ModDefinition>> {
  const updates = await fetchModUpdates(activatedMods);

  return Object.fromEntries(
    Object.entries(updates)
      .filter(([_, update]) => update.backwards_compatible)
      .map(([id, update]) => [id, update.backwards_compatible])
  );
}

function deactivateModComponent(
  modComponent: UnresolvedExtension,
  optionsState: ExtensionOptionsState
  // TODO: do we also need editorState?
  //  editorState: EditorState | undefined,
): ExtensionOptionsState {
  return extensionsSlice.reducer(
    optionsState,
    extensionsSlice.actions.removeExtension({ extensionId: modComponent.id })
  );
}

/**
 * Deactivates all mod components with the given mod id.
 * @param modId the mod registry id
 * @param optionsState the current extension options state
 * @returns {options, deactivatedModComponents} new options state with the mod components deactivated
 * and the mod components that were deactivated
 */
export function deactivateMod(
  modId: RegistryId,
  optionsState: ExtensionOptionsState
  // TODO: do we also need editorState?
  //  editorState: EditorState | undefined,
): {
  optionsState: ExtensionOptionsState;
  deactivatedModComponents: UnresolvedExtension[];
} {
  const activatedModComponentSelector = selectExtensionsForRecipe(modId);
  const activatedModComponents = activatedModComponentSelector({
    options: optionsState,
  });
  const deactivatedModComponents: UnresolvedExtension[] = [];

  let newOptionsState = optionsState;
  for (const activatedModComponent of activatedModComponents) {
    newOptionsState = deactivateModComponent(
      activatedModComponent,
      newOptionsState
    );
    deactivatedModComponents.push(activatedModComponent);
  }

  console.log("*** options state after deactivate mod", newOptionsState);
  return { optionsState: newOptionsState, deactivatedModComponents };
}

function reactivateMod(
  mod: ModDefinition,
  services: Record<RegistryId, UUID>,
  optionsArgs: OptionsArgs,
  optionsState: ExtensionOptionsState
): ExtensionOptionsState {
  const alreadyActivated = optionsState.extensions.find(
    (activatedModComponent) =>
      activatedModComponent._recipe?.id === mod.metadata.id
  );

  if (alreadyActivated) {
    console.error(
      `Mod ${mod.metadata.id} already activated, skipping reactivation`
    );
    return optionsState;
  }

  console.log("*** options state before reactivate mod", optionsState);
  return extensionsSlice.reducer(
    optionsState,
    extensionsSlice.actions.installRecipe({
      recipe: mod,
      services,
      extensionPoints: mod.extensionPoints,
      optionsArgs,
      screen: "background",
      isReinstall: true,
    })
  );
}

export function collectModConfigurations(
  modComponents: UnresolvedExtension[]
): {
  services: Record<RegistryId, UUID>;
  optionsArgs: OptionsArgs;
} {
  const services: Record<RegistryId, UUID> = {};
  let optionsArgs: OptionsArgs = {};

  for (const modComponent of modComponents) {
    optionsArgs = {
      ...optionsArgs,
      ...modComponent.optionsArgs,
    };
    if (!modComponent.services || isEmpty(modComponent.services)) {
      continue;
    }

    for (const { id, config } of modComponent.services) {
      // eslint-disable-next-line security/detect-object-injection -- id is a registry id
      services[id] = config;
    }
  }

  return { services, optionsArgs };
}

function updateMod(
  mod: ModDefinition,
  optionsState: ExtensionOptionsState
): ExtensionOptionsState {
  console.log("*** updating mod", mod);
  let newOptionsState = optionsState;

  // Deactivate the mod
  const { optionsState: deactivatedOptionsState, deactivatedModComponents } =
    deactivateMod(mod.metadata.id, newOptionsState);
  newOptionsState = deactivatedOptionsState;

  // Collect service an option configs to reinstall
  const { services, optionsArgs } = collectModConfigurations(
    deactivatedModComponents
  );

  // Reactivate the mod with the updated mod definition & configurations
  return reactivateMod(mod, services, optionsArgs, newOptionsState);
}

async function updateMods(modUpdates: Record<RegistryId, ModDefinition>) {
  let optionsState = await loadOptions();

  for (const update of Object.values(modUpdates)) {
    optionsState = updateMod(update, optionsState);
  }

  await saveOptions(optionsState);
  await forEachTab(queueReactivateTab);
}

async function updateModsIfUpdatesAvailable() {
  console.log("*** checking for mod updates");

  if (!(await autoModUpdatesEnabled())) {
    return;
  }

  const activatedMarketplaceMods = await getActivatedMarketplaceModMetadata();

  const modUpdates = await getBackwardsCompatibleUpdates(
    activatedMarketplaceMods
  );

  if (isEmpty(modUpdates)) {
    console.debug("No automatic mod updates found");
    return;
  }

  await updateMods(modUpdates);
}

export async function initModUpdater(): Promise<void> {
  setInterval(updateModsIfUpdatesAvailable, UPDATE_INTERVAL_MS);
  void updateModsIfUpdatesAvailable();
}
