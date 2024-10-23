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
import type { AnyAction, ThunkDispatch } from "@reduxjs/toolkit";
import type { ModDefinition } from "@/types/modDefinitionTypes";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import mapModDefinitionToModMetadata from "@/modDefinitions/util/mapModDefinitionToModMetadata";
import type { RegistryId } from "@/types/registryTypes";
import { getDraftModComponentId } from "@/pageEditor/utils";
import type { EditorRootState } from "@/pageEditor/store/editor/pageEditorTypes";
import type { ModComponentsRootState } from "@/store/modComponents/modComponentTypes";

/**
 * Update Redux for a saved mod definition.
 * @param modIdToReplace if provided, the mod to replace in the Page Editor.
 * @param modDefinition the mod definition to save
 * @param draftModComponents mod components for determining options args and configured dependencies. If
 * modIdToReplace is provided, the component ids must correspond to the mod ids for the new mod instance.
 * @param isReactivate true if an activated mod is being reactivated
 */
function updateReduxForSavedModDefinition({
  modIdToReplace,
  modDefinition,
  draftModComponents,
  isReactivate,
}: {
  modIdToReplace?: RegistryId;
  modDefinition: ModDefinition;
  draftModComponents: Array<ModComponentBase | ModComponentFormState>;
  isReactivate: boolean;
}) {
  return async (
    dispatch: ThunkDispatch<
      EditorRootState & ModComponentsRootState,
      unknown,
      AnyAction
    >,
  ): Promise<void> => {
    const modMetadata = mapModDefinitionToModMetadata(modDefinition);

    // Activate/re-activate the mod
    dispatch(modComponentActions.removeModById(modDefinition.metadata.id));

    dispatch(
      modComponentActions.activateMod({
        modDefinition,
        modComponentIds: modIdToReplace
          ? draftModComponents.map((x) => getDraftModComponentId(x))
          : undefined,
        configuredDependencies: collectExistingConfiguredDependenciesForMod(
          modDefinition,
          draftModComponents,
        ),
        optionsArgs: collectModOptionsArgs(draftModComponents),
        screen: "pageEditor",
        isReactivate,
      }),
    );

    // Must dispatch updateModMetadataOnModComponentFormStates first to so the form states are associated with the new
    // mod id. Otherwise, any other actions won't be able to find the form states.
    dispatch(
      editorActions.updateModMetadataOnModComponentFormStates({
        modId: modIdToReplace ?? modMetadata.id,
        modMetadata,
      }),
    );

    dispatch(editorActions.markModAsCleanById(modMetadata.id));

    // Refresh mod availability on page, but don't await because it's not required for save flow
    void dispatch(editorActions.checkAvailableActivatedModComponents());
  };
}

export default updateReduxForSavedModDefinition;
