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
import { getEditorState, saveEditorState } from "@/store/dynamicElementStorage";
import type { EditorState } from "@/pageEditor/pageEditorTypes";
import { editorSlice } from "@/pageEditor/slices/editorSlice";

// TODO: replace me
//  const UPDATE_INTERVAL_MS = 10 * 60 * 1000;
const UPDATE_INTERVAL_MS = 60 * 1000;

type ActivatedModState = {
  options: ExtensionOptionsState;
  editor: EditorState;
};

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

/**
 * Produces an array of mods by registry id and currently installed versions. For use
 * with the payload of the `api/registry/updates` endpoint.
 * @param mods the mod components to collect versions for
 * @returns modVersions a unique list of mod registry ids and their versions
 * and the mod components that were deactivated
 */
export function collectModVersions(
  mods: Array<IExtension["_recipe"]>
): Array<{ name: RegistryId; version: SemVerString }> {
  const modVersions: Array<{ name: RegistryId; version: SemVerString }> = [];

  for (const { id, version } of mods) {
    const existingModVersion = modVersions.find((mod) => mod.name === id);
    if (existingModVersion && existingModVersion.version !== version) {
      reportError(
        new Error(
          `Found two different mod versions activated for the same mod: ${id} (${existingModVersion.version}, ${version}).`
        )
      );
    }

    if (existingModVersion) {
      continue;
    }

    modVersions.push({ name: id, version });
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
  reduxState: ActivatedModState
): ActivatedModState {
  let { options: newOptionsState, editor: newEditorState } = reduxState;

  newOptionsState = extensionsSlice.reducer(
    newOptionsState,
    extensionsSlice.actions.removeExtension({ extensionId: modComponent.id })
  );

  newEditorState = editorSlice.reducer(
    newEditorState,
    editorSlice.actions.removeElement(modComponent.id)
  );

  return {
    options: newOptionsState,
    editor: newEditorState,
  };
}

/**
 * Deactivates all mod components with the given mod id.
 * @param modId the mod registry id
 * @param reduxState the current state of the extension and editor redux stores
 * @returns {reduxState, deactivatedModComponents} new redux state with the mod components deactivated
 * and the mod components that were deactivated
 */
export function deactivateMod(
  modId: RegistryId,
  reduxState: ActivatedModState
): {
  reduxState: ActivatedModState;
  deactivatedModComponents: UnresolvedExtension[];
} {
  let { options: newOptionsState, editor: newEditorState } = reduxState;

  const activatedModComponentSelector = selectExtensionsForRecipe(modId);
  const activatedModComponents = activatedModComponentSelector({
    options: newOptionsState,
  });

  const deactivatedModComponents: UnresolvedExtension[] = [];
  for (const activatedModComponent of activatedModComponents) {
    const { options: nextOptionsState, editor: nextEditorState } =
      deactivateModComponent(activatedModComponent, {
        options: newOptionsState,
        editor: newEditorState,
      });
    newOptionsState = nextOptionsState;
    newEditorState = nextEditorState;

    deactivatedModComponents.push(activatedModComponent);
  }

  return {
    reduxState: { options: newOptionsState, editor: newEditorState },
    deactivatedModComponents,
  };
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
  reduxState: ActivatedModState
): ActivatedModState {
  console.log("*** updating mod", mod);
  let { options: newOptionsState, editor: newEditorState } = reduxState;

  // Deactivate the mod
  const {
    reduxState: { options: nextOptionsState, editor: nextEditorState },
    deactivatedModComponents,
  } = deactivateMod(mod.metadata.id, {
    options: newOptionsState,
    editor: newEditorState,
  });
  newOptionsState = nextOptionsState;
  newEditorState = nextEditorState;

  // Collect service an option configs to reinstall
  const { services, optionsArgs } = collectModConfigurations(
    deactivatedModComponents
  );

  // Reactivate the mod with the updated mod definition & configurations
  newOptionsState = reactivateMod(mod, services, optionsArgs, newOptionsState);

  return {
    options: newOptionsState,
    editor: newEditorState,
  };
}

async function updateMods(modUpdates: Record<RegistryId, ModDefinition>) {
  let newOptionsState = await loadOptions();
  let newEditorState = await getEditorState();

  console.log("*** state before update mods", newOptionsState);

  for (const update of Object.values(modUpdates)) {
    const { options, editor } = updateMod(update, {
      options: newOptionsState,
      editor: newEditorState,
    });
    newOptionsState = options;
    newEditorState = editor;
  }

  await saveOptions(newOptionsState);
  await saveEditorState(newEditorState);
  await forEachTab(queueReactivateTab);

  console.log("*** state after update mods", newOptionsState);
}

// TODO: updateModsIfForceUpdatesAvailable?
export async function updateModsIfUpdatesAvailable() {
  console.log("*** checking for mod updates");

  const optionsState = await loadOptions();
  console.log("*** options state", optionsState);

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

export function initModUpdater(): void {
  setInterval(updateModsIfUpdatesAvailable, UPDATE_INTERVAL_MS);
  void updateModsIfUpdatesAvailable();
}
