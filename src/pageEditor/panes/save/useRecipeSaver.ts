/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  selectDirtyRecipeMetadata,
  selectDirtyRecipeOptions,
  selectElements,
} from "@/pageEditor/slices/editorSelectors";
import {
  useGetEditablePackagesQuery,
  useGetRecipesQuery,
  useUpdateRecipeMutation,
} from "@/services/api";
import { isEmpty } from "lodash";
import notify from "@/utils/notify";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { useModals } from "@/components/ConfirmationModal";
import { selectExtensions } from "@/store/extensionsSelectors";
import { replaceRecipeContent } from "@/pageEditor/panes/save/saveHelpers";
import { selectRecipeMetadata } from "@/pageEditor/panes/save/useSavingWizard";
import { PackageUpsertResponse } from "@/types/contract";
import extensionsSlice from "@/store/extensionsSlice";
import useCreate from "@/pageEditor/hooks/useCreate";
import { RegistryId } from "@/core";

const { actions: optionsActions } = extensionsSlice;

type RecipeSaver = {
  save: (recipeId: RegistryId) => Promise<void>;
  isSaving: boolean;
};

function useRecipeSaver(): RecipeSaver {
  const dispatch = useDispatch();
  const create = useCreate();
  const { data: recipes } = useGetRecipesQuery();
  const { data: editablePackages } = useGetEditablePackagesQuery();
  const [updateRecipe] = useUpdateRecipeMutation();
  const dirtyElements = useSelector(selectElements);
  const installedExtensions = useSelector(selectExtensions);
  const dirtyRecipeOptions = useSelector(selectDirtyRecipeOptions);
  const dirtyRecipeMetadata = useSelector(selectDirtyRecipeMetadata);
  const { showConfirmation } = useModals();
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Save a recipe's extensions, options, and metadata
   */
  const save = useCallback(
    async (recipeId: RegistryId) => {
      const recipe = recipes?.find((recipe) => recipe.metadata.id === recipeId);
      if (recipe == null) {
        notify.error(
          "You no longer have edit permissions for the blueprint. Please reload the Editor."
        );
        return;
      }

      const newOptions = dirtyRecipeOptions[recipe.metadata.id];
      const newMetadata = dirtyRecipeMetadata[recipe.metadata.id];
      if (newOptions == null && newMetadata == null && isEmpty(dirtyElements)) {
        return;
      }

      const confirm = await showConfirmation({
        title: "Save Blueprint?",
        message:
          "All changes to the blueprint and its extensions will be saved",
        submitCaption: "Save",
      });

      if (!confirm) {
        return;
      }

      setIsSaving(true);

      const newRecipe = replaceRecipeContent({
        sourceRecipe: recipe,
        installedExtensions,
        dirtyElements,
        options: newOptions,
        metadata: newMetadata,
      });

      const packageId = editablePackages.find(
        // Bricks endpoint uses "name" instead of id
        (x) => x.name === newRecipe.metadata.id
      )?.id;

      let updateRecipeResponse: PackageUpsertResponse;
      try {
        updateRecipeResponse = await updateRecipe({
          packageId,
          recipe: newRecipe,
        }).unwrap();
      } catch (error: unknown) {
        notify.error({
          message: "Failed to update the Blueprint",
          error,
        });
        setIsSaving(false);
        return;
      }

      const newRecipeMetadata = selectRecipeMetadata(
        newRecipe,
        updateRecipeResponse
      );

      try {
        for (const element of dirtyElements) {
          // Don't push to cloud since we're saving it with the recipe
          // eslint-disable-next-line no-await-in-loop
          await create({ element, pushToCloud: false });
        }
      } catch (error: unknown) {
        notify.error({
          message: "Failed saving extension",
          error,
        });
        setIsSaving(false);
        return;
      }

      // Update the recipe metadata on extensions in the options slice
      dispatch(
        optionsActions.updateRecipeMetadataForExtensions(newRecipeMetadata)
      );

      // Update the recipe metadata on elements in the page editor slice
      dispatch(
        editorActions.updateRecipeMetadataForElements(newRecipeMetadata)
      );

      // Clear the dirty state
      dispatch(
        editorActions.resetRecipeMetadataAndOptions(newRecipeMetadata.id)
      );

      // Finish up successfully
      notify.success("Saved blueprint");
      setIsSaving(false);
    },
    [
      create,
      dirtyElements,
      dirtyRecipeMetadata,
      dirtyRecipeOptions,
      dispatch,
      editablePackages,
      installedExtensions,
      recipes,
      showConfirmation,
      updateRecipe,
    ]
  );

  return {
    save,
    isSaving,
  };
}

export default useRecipeSaver;
