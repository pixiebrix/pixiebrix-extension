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

import type { ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import type { ModComponentBase } from "@/types/modComponentTypes";
import { actions as modComponentActions } from "@/store/modComponents/modComponentSlice";
import collectExistingConfiguredDependenciesForMod from "@/integrations/util/collectExistingConfiguredDependenciesForMod";
import { collectModOptionsArgs } from "@/store/modComponents/modComponentUtils";
import type { Dispatch } from "@reduxjs/toolkit";
import type { ModDefinition } from "@/types/modDefinitionTypes";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import { getModComponentItemId } from "@/pageEditor/modListingPanel/common";
import mapModDefinitionToModMetadata from "@/modDefinitions/util/mapModDefinitionToModMetadata";
import type { RegistryId } from "@/types/registryTypes";

/**
 * Update Redux and runtime state for a saved mod definition.
 * @param dispatch Redux dispatch function
 * @param modIdToReplace if provided, the mod to replace in the Page Editor.
 * @param modDefinition the mod definition to save
 * @param cleanModComponents clean mod components for determining options args and configured dependencies. If
 * modIdToReplace is provided, the component ids must correspond to the mod ids for the new mod instance.
 * @param dirtyModComponentFormStates form states for determining options args and configured dependencies. If
 * modIdToReplace is provided, the component ids must correspond to the mod ids for the new mod instance.
 * @param isReactivate true if an activated mod is being reactivated
 */
async function updateReduxAndRuntimeForSavedModDefinition({
  dispatch,
  modIdToReplace,
  modDefinition,
  cleanModComponents,
  dirtyModComponentFormStates,
  isReactivate,
}: {
  dispatch: Dispatch;
  modIdToReplace?: RegistryId;
  modDefinition: ModDefinition;
  cleanModComponents: ModComponentBase[];
  dirtyModComponentFormStates: ModComponentFormState[];
  isReactivate: boolean;
}) {
  const modMetadata = mapModDefinitionToModMetadata(modDefinition);

  // Must match the order in buildNewMod, otherwise modComponentIds will be mismatched
  const modComponents = [...cleanModComponents, ...dirtyModComponentFormStates];

  // Activate/re-activate the mod

  dispatch(modComponentActions.removeModById(modDefinition.metadata.id));

  dispatch(
    modComponentActions.activateMod({
      modDefinition,
      modComponentIds: modIdToReplace
        ? modComponents.map((x) => getModComponentItemId(x))
        : undefined,
      configuredDependencies: collectExistingConfiguredDependenciesForMod(
        modDefinition,
        modComponents,
      ),
      optionsArgs: collectModOptionsArgs(modComponents),
      screen: "pageEditor",
      isReactivate,
    }),
  );

  // Must dispatch updateModMetadataOnModComponentFormStates first to so the form states are associated with the new
  // mod id. Otherwise, the other actions won't be able to find the form states.
  dispatch(
    editorActions.updateModMetadataOnModComponentFormStates({
      modId: modIdToReplace ?? modMetadata.id,
      modMetadata,
    }),
  );

  dispatch(editorActions.markModAsCleanById(modMetadata.id));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- thunk action doesn't match AnyAction
  dispatch(editorActions.checkAvailableActivatedModComponents() as any);
}

export default updateReduxAndRuntimeForSavedModDefinition;
