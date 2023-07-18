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

import type { Me, PackageVersionUpdates } from "@/types/contract";
import { maybeGetLinkedApiClient } from "@/services/apiClient";
import reportError from "@/telemetry/reportError";
import { loadOptions, saveOptions } from "@/store/extensionsStorage";
import type { RegistryId, SemVerString } from "@/types/registryTypes";
import type { ModDefinition } from "@/types/modDefinitionTypes";
import { selectExtensionsForRecipe } from "@/store/extensionsSelectors";
import extensionsSlice from "@/store/extensionsSlice";
import type { UUID } from "@/types/stringTypes";
import type { OptionsArgs } from "@/types/runtimeTypes";
import { groupBy, isEmpty } from "lodash";
import { forEachTab } from "@/background/activeTab";
import { queueReactivateTab } from "@/contentScript/messenger/api";
import { getEditorState, saveEditorState } from "@/store/dynamicElementStorage";
import type { EditorState } from "@/pageEditor/pageEditorTypes";
import { editorSlice } from "@/pageEditor/slices/editorSlice";
import { type ModComponentOptionsState } from "@/store/extensionsTypes";
import type {
  ActivatedModComponent,
  UnresolvedModComponent,
} from "@/types/modComponentTypes";
import { inferRecipeAuths, inferRecipeOptions } from "@/store/extensionsUtils";

const UPDATE_INTERVAL_MS = 10 * 60 * 1000;

type ActivatedModState = {
  options: ModComponentOptionsState;
  editor: EditorState;
};

type BackwardsCompatibleUpdate = {
  name: RegistryId;
  backwards_compatible: ModDefinition;
};

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
 * @returns a unique list of mod registry ids and their versions
 */
export function collectModVersions(
  mods: Array<ActivatedModComponent["_recipe"]>
): Array<{ name: RegistryId; version: SemVerString }> {
  const modVersions: Array<{ name: RegistryId; version: SemVerString }> = [];

  for (const [name, modComponents] of Object.entries(
    groupBy(mods, "id")
  ) as Array<[RegistryId, Array<ActivatedModComponent["_recipe"]>]>) {
    if (modComponents.length > 0) {
      reportError(
        new Error(
          `Found multiple mod component versions activated for the same mod: ${name} (${modComponents
            .map((version) => version.version)
            .join(", ")})`
        )
      );
    }

    modVersions.push({ name, version: modComponents[0].version });
  }

  return modVersions;
}

/**
 * Gets a list of activated Marketplace mod metadata, assuming that Marketplace mods are
 * any public mods that are not deployments.
 * @returns a list of mod metadata for activated Marketplace mods
 */
export async function getActivatedMarketplaceModMetadata(): Promise<
  Array<ActivatedModComponent["_recipe"]>
> {
  const { extensions: activatedModComponents } = await loadOptions();

  // Typically most Marketplace mods would not be a deployment. If this happens to be the case,
  // the deployment updater will handle the updates.
  return activatedModComponents
    .filter((mod) => mod._recipe?.sharing?.public && !mod._deployment)
    .map((mod) => mod._recipe);
}

/**
 * Given a list of currently activated mods, fetches information about backwards compatible "force updates"
 * for those mods.
 * @param activatedMods mods that are currently activated
 * @returns a list of mods with backwards compatible updates
 */
export async function fetchModUpdates(
  activatedMods: Array<ActivatedModComponent["_recipe"]>
): Promise<BackwardsCompatibleUpdate[]> {
  const client = await maybeGetLinkedApiClient();
  if (client == null) {
    console.debug(
      "Skipping automatic mod updates because the extension is not linked to the PixieBrix service"
    );
    return [];
  }

  try {
    const {
      data: { updates },
    } = await client.post<PackageVersionUpdates>("/api/registry/updates/", {
      versions: collectModVersions(activatedMods),
    });

    // Only return backwards compatible updates for now. Future work outlines
    // handling backwards incompatible updates as well.
    return updates
      .filter(({ backwards_compatible }) => backwards_compatible)
      .map(({ name, backwards_compatible }) => ({
        name,
        backwards_compatible,
      }));
  } catch (error) {
    reportError(error);
    return [];
  }
}

/**
 * Deactivates the mod component from the extensions and editor redux stores.
 * @param modComponent the mod component to deactivate
 * @param reduxState the current state of the extension and editor redux stores
 * @returns {reduxState, deactivatedModComponents} new redux state with the mod component deactivated
 */
function deactivateModComponent(
  modComponent: UnresolvedModComponent,
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
  deactivatedModComponents: UnresolvedModComponent[];
} {
  let { options: newOptionsState, editor: newEditorState } = reduxState;

  const activatedModComponentSelector = selectExtensionsForRecipe(modId);
  const activatedModComponents = activatedModComponentSelector({
    options: newOptionsState,
  });

  const deactivatedModComponents: UnresolvedModComponent[] = [];
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

/**
 * Activates the mod assuming it has been deactivated. Also assumes that
 * services and optionsArgs are the same as when the mod was deactivated.
 */
function reactivateMod(
  mod: ModDefinition,
  services: Record<RegistryId, UUID>,
  optionsArgs: OptionsArgs,
  optionsState: ModComponentOptionsState
): ModComponentOptionsState {
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

/**
 * We currently don't have a way to "update" activated mods directly in the extension and editor redux stores.
 * Therefore, to update the mod, we deactivate and reactivate the mod with all the same configurations.
 * @param mod the mod to update
 * @param reduxState the current state of the extension and editor redux stores
 * @returns new redux state with the mod updated
 */
function updateMod(
  mod: ModDefinition,
  reduxState: ActivatedModState
): ActivatedModState {
  let { options: newOptionsState, editor: newEditorState } = reduxState;

  const {
    reduxState: { options: nextOptionsState, editor: nextEditorState },
    deactivatedModComponents,
  } = deactivateMod(mod.metadata.id, {
    options: newOptionsState,
    editor: newEditorState,
  });
  newOptionsState = nextOptionsState;
  newEditorState = nextEditorState;

  const services = inferRecipeAuths(deactivatedModComponents);
  const optionsArgs = inferRecipeOptions(deactivatedModComponents);

  newOptionsState = reactivateMod(mod, services, optionsArgs, newOptionsState);

  return {
    options: newOptionsState,
    editor: newEditorState,
  };
}

async function updateMods(modUpdates: BackwardsCompatibleUpdate[]) {
  let newOptionsState = await loadOptions();
  let newEditorState = await getEditorState();

  for (const { backwards_compatible: update } of modUpdates) {
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
}

export async function updateModsIfForceUpdatesAvailable() {
  if (!(await autoModUpdatesEnabled())) {
    return;
  }

  const activatedMarketplaceMods = await getActivatedMarketplaceModMetadata();

  const backwardsCompatibleModUpdates = await fetchModUpdates(
    activatedMarketplaceMods
  );

  if (isEmpty(backwardsCompatibleModUpdates)) {
    console.debug("No automatic mod updates found");
    return;
  }

  await updateMods(backwardsCompatibleModUpdates);
}

export function initModUpdater(): void {
  setInterval(updateModsIfForceUpdatesAvailable, UPDATE_INTERVAL_MS);
  void updateModsIfForceUpdatesAvailable();
}
