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

import type { PackageVersionUpdates } from "@/types/contract";
import { maybeGetLinkedApiClient } from "@/data/service/apiClient";
import reportError from "@/telemetry/reportError";
import {
  getModComponentState,
  saveModComponentState,
} from "@/store/modComponents/modComponentStorage";
import type { RegistryId, SemVerString } from "@/types/registryTypes";
import type { ModDefinition } from "@/types/modDefinitionTypes";
import modComponentSlice from "@/store/modComponents/modComponentSlice";
import { groupBy, isEmpty, uniq } from "lodash";
import { queueReloadModEveryTab } from "@/contentScript/messenger/api";
import { getEditorState, saveEditorState } from "@/store/editorStorage";
import type { EditorState } from "@/pageEditor/store/editor/pageEditorTypes";
import type { ActivatedModComponent } from "@/types/modComponentTypes";
import { collectModOptions } from "@/store/modComponents/modComponentUtils";
import type { ModComponentState } from "@/store/modComponents/modComponentTypes";
import { uninstallContextMenu } from "@/background/contextMenus/uninstallContextMenu";
import collectExistingConfiguredDependenciesForMod from "@/integrations/util/collectExistingConfiguredDependenciesForMod";
import { flagOn } from "@/auth/featureFlagStorage";
import { assertNotNullish } from "@/utils/nullishUtils";
import { FeatureFlags } from "@/auth/featureFlags";
import { API_PATHS } from "@/data/service/urlPaths";
import deactivateMod from "@/background/utils/deactivateMod";

const UPDATE_INTERVAL_MS = 10 * 60 * 1000;

type ActivatedModState = {
  options: ModComponentState;
  editor: EditorState | undefined;
};

type BackwardsCompatibleUpdate = {
  name: RegistryId;
  backwards_compatible: ModDefinition;
};

type PackageVersionPair = { name: RegistryId; version: SemVerString };

/**
 * Produces an array of activated Marketplace mods by registry id and currently activated versions. For use
 * with the payload of the `api/registry/updates` endpoint.
 * @returns a unique list of mod registry ids and their versions
 */
export async function getActivatedMarketplaceModVersions(): Promise<
  PackageVersionPair[]
> {
  const { activatedModComponents } = await getModComponentState();

  // Typically most Marketplace mods would not be a deployment. If this happens to be the case,
  // the deployment updater will handle the updates.
  const mods: Array<ActivatedModComponent["_recipe"]> = activatedModComponents
    .filter((mod) => mod._recipe?.sharing?.public && !mod._deployment)
    .map((mod) => mod._recipe);

  const modVersions: PackageVersionPair[] = [];

  for (const [name, modComponents] of Object.entries(
    groupBy(mods, "id"),
  ) as Array<[RegistryId, Array<ActivatedModComponent["_recipe"]>]>) {
    const uniqueModVersions: SemVerString[] = uniq(
      modComponents
        .map((modComponent) => modComponent?.version)
        .filter((x) => x != null),
    );

    if (uniqueModVersions.length > 1) {
      reportError(
        new Error(
          `Found multiple mod component versions activated for the same mod: ${name} (${uniqueModVersions.join(
            ", ",
          )})`,
        ),
      );
    }

    assertNotNullish(uniqueModVersions[0], "Mod component version is required");

    modVersions.push({ name, version: uniqueModVersions[0] });
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
      "Skipping automatic mod updates because the extension is not linked to the PixieBrix service",
    );
    return [];
  }

  const modVersions = await getActivatedMarketplaceModVersions();

  if (isEmpty(modVersions)) {
    return [];
  }

  try {
    const {
      data: { updates },
    } = await client.post<PackageVersionUpdates>(API_PATHS.REGISTRY_UPDATES, {
      versions: modVersions,
    });

    // Only return backwards compatible updates for now. Future work outlines
    // handling backwards incompatible updates as well.
    return updates
      .filter(({ backwards_compatible }) => backwards_compatible != null)
      .map(({ name, backwards_compatible }) => ({
        name,
        backwards_compatible,
      })) as BackwardsCompatibleUpdate[];
  } catch (error) {
    reportError(error);
    return [];
  }
}

/**
 * Update the mod by deactivating and reactivating the mod with all the same configurations.
 *
 * We currently don't have a way to "update" activated mods directly in the extension and editor redux stores.
 *
 * The ModComponents will have new UUIDs.
 *
 * @param modDefinition the mod to update
 * @param reduxState the current state of the modComponent and editor redux stores
 * @returns new redux state with the mod updated
 */
function updateMod(
  modDefinition: ModDefinition,
  { options: modComponentState, editor: editorState }: ActivatedModState,
): ActivatedModState {
  const {
    modComponentState: nextModComponentState,
    editorState: nextEditorState,
    // This type is weird, please ignore it for now, we need to clean up a lot of stuff with these
    // mod component types. These "deactivated" components are not passed anywhere else, or put into
    // redux, or anything like that. They are only used to collect the configured dependencies and the
    // mod options in order to re-install the mod (see the calls to collectExistingConfiguredDependenciesForMod
    // and collectRecipeOptions immediately following this code).
    deactivatedModComponents,
  } = deactivateMod(modDefinition.metadata.id, {
    modComponentState,
    editorState,
  });

  for (const deactivatedModComponent of deactivatedModComponents) {
    // Remove the menu item UI from all mods. We must explicitly remove context menu items because otherwise the user
    // will see duplicate menu items because the old/new mod components have different UUIDs.
    // `updateMods` calls `queueReloadModEveryTab`. Therefore, if the user clicks on a tab where the new version of the
    // mod component is not loaded yet, they'll get a notification to reload the page.
    void uninstallContextMenu({ modComponentId: deactivatedModComponent.id });
  }

  const configuredDependencies = collectExistingConfiguredDependenciesForMod(
    modDefinition,
    deactivatedModComponents,
  );

  const optionsArgs = collectModOptions(
    deactivatedModComponents.filter((modComponent) => modComponent.optionsArgs),
  );

  const finalModComponentState = modComponentSlice.reducer(
    nextModComponentState,
    modComponentSlice.actions.activateMod({
      modDefinition,
      configuredDependencies,
      optionsArgs,
      screen: "background",
      isReactivate: true,
    }),
  );

  return {
    options: finalModComponentState,
    editor: nextEditorState,
  };
}

async function updateMods(modUpdates: BackwardsCompatibleUpdate[]) {
  let newOptionsState = await getModComponentState();
  let newEditorState = await getEditorState();

  for (const { backwards_compatible: update } of modUpdates) {
    const { options, editor } = updateMod(update, {
      options: newOptionsState,
      editor: newEditorState,
    });
    newOptionsState = options;
    newEditorState = editor;
  }

  await Promise.all([
    saveModComponentState(newOptionsState),
    saveEditorState(newEditorState),
  ]);

  queueReloadModEveryTab();
}

export async function updateModsIfForceUpdatesAvailable() {
  const autoModUpdatesEnabled = await flagOn(
    FeatureFlags.AUTOMATIC_MOD_UPDATES,
  );
  if (!autoModUpdatesEnabled) {
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
