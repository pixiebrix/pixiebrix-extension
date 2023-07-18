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
import { groupBy, isEmpty } from "lodash";
import { forEachTab } from "@/background/activeTab";
import { queueReactivateTab } from "@/contentScript/messenger/api";
import { getEditorState, saveEditorState } from "@/store/dynamicElementStorage";
import type { EditorState } from "@/pageEditor/pageEditorTypes";
import { editorSlice } from "@/pageEditor/slices/editorSlice";
import type {
  ActivatedModComponent,
  UnresolvedModComponent,
} from "@/types/modComponentTypes";
import { inferRecipeAuths, inferRecipeOptions } from "@/store/extensionsUtils";
import type { ModComponentOptionsState } from "@/store/extensionsTypes";
import type { IntegrationDependency } from "@/types/integrationTypes";
import type { OptionsArgs } from "@/types/runtimeTypes";

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
 * Produces an array of activated Marketplace mods by registry id and currently activated versions. For use
 * with the payload of the `api/registry/updates` endpoint.
 * @returns a unique list of mod registry ids and their versions
 */
export async function getActivatedMarketplaceModVersions(): Promise<
  Array<{ name: RegistryId; version: SemVerString }>
> {
  const { extensions: activatedModComponents } = await loadOptions();

  // Typically most Marketplace mods would not be a deployment. If this happens to be the case,
  // the deployment updater will handle the updates.
  const mods: Array<ActivatedModComponent["_recipe"]> = activatedModComponents
    .filter((mod) => mod._recipe?.sharing?.public && !mod._deployment)
    .map((mod) => mod._recipe);

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
 * Fetches information about backwards compatible "force updates" for Marketplace mods that are currently activated.
 * @returns a list of mods with backwards compatible updates
 */
export async function fetchModUpdates(): Promise<BackwardsCompatibleUpdate[]> {
  const client = await maybeGetLinkedApiClient();
  if (client == null) {
    console.debug(
      "Skipping automatic mod updates because the extension is not linked to the PixieBrix service"
    );
    return [];
  }

  const modVersions = await getActivatedMarketplaceModVersions();

  try {
    const {
      data: { updates },
    } = await client.post<PackageVersionUpdates>("/api/registry/updates/", {
      versions: modVersions,
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
 * @returns the new redux state with the mod component deactivated
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

  const services = inferRecipeAuths(
    deactivatedModComponents.filter(
      (modComponent) => modComponent.services
    ) as Array<
      Exclude<UnresolvedModComponent, "services"> & {
        services: IntegrationDependency[];
      }
    >
  );

  const optionsArgs = inferRecipeOptions(
    deactivatedModComponents.filter(
      (modComponent) => modComponent.optionsArgs
    ) as Array<
      Exclude<UnresolvedModComponent, "optionsArgs"> & {
        optionsArgs: OptionsArgs;
      }
    >
  );

  newOptionsState = extensionsSlice.reducer(
    newOptionsState,
    extensionsSlice.actions.installRecipe({
      recipe: mod,
      services,
      extensionPoints: mod.extensionPoints,
      optionsArgs,
      screen: "background",
      isReinstall: true,
    })
  );

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

  const backwardsCompatibleModUpdates = await fetchModUpdates();

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
