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

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  selectDeletedElements,
  selectDirty,
  selectDirtyRecipeMetadata,
  selectDirtyRecipeOptions,
  selectElements,
} from "@/pageEditor/slices/editorSelectors";
import {
  useGetEditablePackagesQuery,
  useGetRecipesQuery,
  useUpdateRecipeMutation,
} from "@/services/api";
import notify from "@/utils/notify";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { useModals } from "@/components/ConfirmationModal";
import { selectExtensions } from "@/store/extensionsSelectors";
import {
  buildRecipe,
  isRecipeEditable,
} from "@/pageEditor/panes/save/saveHelpers";
import { selectRecipeMetadata } from "@/pageEditor/panes/save/useSavingWizard";
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
  const { data: recipes, isLoading: isRecipesLoading } = useGetRecipesQuery();
  const { data: editablePackages, isLoading: isEditablePackagesLoading } =
    useGetEditablePackagesQuery();
  const [updateRecipe] = useUpdateRecipeMutation();
  const editorFormElements = useSelector(selectElements);
  const isDirtyByElementId = useSelector(selectDirty);
  const installedExtensions = useSelector(selectExtensions);
  const dirtyRecipeOptions = useSelector(selectDirtyRecipeOptions);
  const dirtyRecipeMetadata = useSelector(selectDirtyRecipeMetadata);
  const deletedElementsByRecipeId = useSelector(selectDeletedElements);
  const { showConfirmation } = useModals();
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Save a recipe's extensions, options, and metadata
   * Throws errors for various bad states
   * @return boolean indicating successful save
   */
  async function save(recipeId: RegistryId): Promise<boolean> {
    const recipe = recipes?.find((recipe) => recipe.metadata.id === recipeId);
    if (recipe == null) {
      throw new Error(
        "You no longer have edit permissions for the blueprint. Please reload the Editor."
      );
    }

    if (!isRecipeEditable(editablePackages, recipe)) {
      dispatch(editorActions.showSaveAsNewRecipeModal());
      return false;
    }

    // eslint-disable-next-line security/detect-object-injection -- recipeId
    const deletedElements = deletedElementsByRecipeId[recipeId] ?? [];
    const deletedElementIds = new Set(deletedElements.map(({ uuid }) => uuid));

    const dirtyRecipeElements = editorFormElements.filter(
      (element) =>
        element.recipe?.id === recipeId &&
        isDirtyByElementId[element.uuid] &&
        !deletedElementIds.has(element.uuid)
    );
    const cleanRecipeExtensions = installedExtensions.filter(
      (extension) =>
        extension._recipe?.id === recipeId &&
        !dirtyRecipeElements.some((element) => element.uuid === extension.id) &&
        !deletedElementIds.has(extension.id)
    );
    // eslint-disable-next-line security/detect-object-injection -- new recipe IDs are sanitized in the form validation
    const newOptions = dirtyRecipeOptions[recipeId];
    // eslint-disable-next-line security/detect-object-injection -- new recipe IDs are sanitized in the form validation
    const newMetadata = dirtyRecipeMetadata[recipeId];

    const confirm = await showConfirmation({
      title: "Save Blueprint?",
      message: "All changes to the blueprint and its extensions will be saved",
      submitCaption: "Save",
      submitVariant: "primary",
    });

    if (!confirm) {
      return false;
    }

    const newRecipe = buildRecipe({
      sourceRecipe: recipe,
      cleanRecipeExtensions,
      dirtyRecipeElements,
      options: newOptions,
      metadata: newMetadata,
    });

    const packageId = editablePackages.find(
      // Bricks endpoint uses "name" instead of id
      (x) => x.name === newRecipe.metadata.id
    )?.id;

    const response = await updateRecipe({
      packageId,
      recipe: newRecipe,
    }).unwrap();

    const newRecipeMetadata = selectRecipeMetadata(newRecipe, response);

    // Don't push to cloud since we're saving it with the recipe
    await Promise.all(
      dirtyRecipeElements.map(async (element) =>
        create({ element, pushToCloud: false })
      )
    );

    // Update the recipe metadata on extensions in the options slice
    dispatch(
      optionsActions.updateRecipeMetadataForExtensions(newRecipeMetadata)
    );

    // Update the recipe metadata on elements in the page editor slice
    dispatch(editorActions.updateRecipeMetadataForElements(newRecipeMetadata));

    // Remove any deleted elements from the extensions slice
    for (const extensionId of deletedElementIds) {
      dispatch(optionsActions.removeExtension({ extensionId }));
    }

    // Clear the dirty states
    dispatch(
      editorActions.resetMetadataAndOptionsForRecipe(newRecipeMetadata.id)
    );
    dispatch(editorActions.clearDeletedElementsForRecipe(newRecipeMetadata.id));

    return true;
  }

  async function safeSave(recipeId: RegistryId) {
    if (isRecipesLoading || isEditablePackagesLoading) {
      return;
    }

    setIsSaving(true);
    try {
      const success = await save(recipeId);
      if (success) {
        notify.success("Saved blueprint");
      }
    } catch (error: unknown) {
      notify.error({
        message: "Failed saving blueprint",
        error,
      });
    } finally {
      setIsSaving(false);
    }
  }

  return {
    save: safeSave,
    isSaving,
  };
}

export default useRecipeSaver;
