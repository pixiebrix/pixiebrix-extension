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

import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { useGetEditablePackagesQuery } from "@/data/service/api";
import notify from "@/utils/notify";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import { type RegistryId } from "@/types/registryTypes";
import { useAllModDefinitions } from "@/modDefinitions/modDefinitionHooks";
import type { EditablePackageMetadata } from "@/types/contract";
import type { ModDefinition } from "@/types/modDefinitionTypes";
import { assertNotNullish, type Nullishable } from "@/utils/nullishUtils";
import { isInnerDefinitionRegistryId } from "@/types/helpers";
import { type AppDispatch } from "@/pageEditor/store/store";

/** @internal */
export function isModEditable(
  editablePackages: EditablePackageMetadata[],
  // Nullishable because the user might lose access to the mod while they were editing it (the mod or a mod component)
  // See https://github.com/pixiebrix/pixiebrix-extension/issues/2813
  modDefinition: Nullishable<ModDefinition>,
): boolean {
  const modId = modDefinition?.metadata.id;
  return modId != null && editablePackages.some((x) => x.name === modId);
}

/**
 * Returns a callback to show the appropriate save modal based on whether:
 * - The mod have been saved yet
 * - The user has edit permissions for the mod
 */
function useSaveMod(): (modId: RegistryId) => Promise<void> {
  const dispatch = useDispatch<AppDispatch>();
  const {
    data: modDefinitions,
    isLoading: isModDefinitionsLoading,
    error: modDefinitionsError,
  } = useAllModDefinitions();

  const { data: editablePackages, isLoading: isEditablePackagesLoading } =
    useGetEditablePackagesQuery();

  return useCallback(
    async (sourceModId: RegistryId) => {
      if (modDefinitionsError) {
        notify.error({
          message: "Error loading mod definitions",
          error: modDefinitionsError,
        });

        return;
      }

      if (isModDefinitionsLoading || isEditablePackagesLoading) {
        notify.error({
          message: "Mod definitions not loaded yet. Try again.",
        });

        return;
      }

      if (isInnerDefinitionRegistryId(sourceModId)) {
        dispatch(
          editorActions.showCreateModModal({
            keepLocalCopy: false,
            sourceModId,
          }),
        );

        return;
      }

      assertNotNullish(
        modDefinitions,
        "saveMod called without modDefinitions loaded",
      );
      assertNotNullish(
        editablePackages,
        "saveMod called without editablePackages loaded",
      );

      const sourceModDefinition = modDefinitions.find(
        (x) => x.metadata.id === sourceModId,
      );

      if (sourceModDefinition == null) {
        notify.error({
          message:
            "You no longer have access to this mod package. Please reload the Page Editor.",
        });

        return;
      }

      if (!isModEditable(editablePackages, sourceModDefinition)) {
        dispatch(editorActions.showSaveAsNewModModal());

        return;
      }

      dispatch(
        editorActions.showSaveModVersionModal({
          modId: sourceModId,
          sourceModDefinition,
        }),
      );
    },
    [
      dispatch,
      isEditablePackagesLoading,
      isModDefinitionsLoading,
      editablePackages,
      modDefinitions,
      modDefinitionsError,
    ],
  );
}

export default useSaveMod;
