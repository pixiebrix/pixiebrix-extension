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
import { assertNotNullish } from "@/utils/nullishUtils";
import { isInnerDefinitionRegistryId } from "@/types/helpers";
import { type AppDispatch } from "@/pageEditor/store/store";
import useMergeAsyncState from "@/hooks/useMergeAsyncState";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { type EditablePackageMetadata } from "@/types/contract";

/**
 * Returns a callback to show the appropriate save modal based on whether:
 * - The mod have been saved yet
 * - The user has edit permissions for the mod
 */
function useSaveMod(): (modId: RegistryId) => Promise<void> {
  const dispatch = useDispatch<AppDispatch>();
  const modDefinitionsQuery = useAllModDefinitions();
  const editablePackagesQuery = useGetEditablePackagesQuery();

  const registryQuery = useMergeAsyncState(
    modDefinitionsQuery,
    editablePackagesQuery,
    (
      modDefinitions: ModDefinition[],
      editablePackages: EditablePackageMetadata[],
    ) => ({
      modDefinitions,
      editablePackages,
    }),
  );

  return useCallback(
    async (sourceModId: RegistryId) => {
      if (isInnerDefinitionRegistryId(sourceModId)) {
        dispatch(
          editorActions.showCreateModModal({
            keepLocalCopy: false,
            sourceModId,
          }),
        );

        return;
      }

      if (registryQuery.isError) {
        notify.error({
          message: "Error loading mod definitions",
          error: registryQuery.error,
        });

        return;
      }

      if (!registryQuery.isSuccess) {
        notify.error({
          message: "Mod definitions not loaded yet. Try again.",
        });

        return;
      }

      assertNotNullish(registryQuery.data, "Expected data");
      const { modDefinitions, editablePackages } = registryQuery.data;

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

      // Registry edit endpoints use package surrogate id
      const packageId = editablePackages.find(
        (x) => x.name === sourceModId,
      )?.id;

      if (packageId == null) {
        dispatch(editorActions.showSaveAsNewModModal());

        return;
      }

      dispatch(
        editorActions.showSaveModVersionModal({
          packageId,
          sourceModDefinition,
        }),
      );
    },
    [dispatch, registryQuery],
  );
}

export default useSaveMod;
