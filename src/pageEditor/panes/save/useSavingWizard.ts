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

import { actions as savingExtensionActions } from "./savingExtensionSlice";
import { useDispatch, useSelector } from "react-redux";
import { selectIsSaving, selectIsWizardOpen } from "./savingExtensionSelectors";
import {
  selectActiveElement,
  selectElements,
} from "@/pageEditor/slices/editorSelectors";
import useCreate from "@/pageEditor/hooks/useCreate";
import {
  actions as editorActions,
  FormState,
} from "@/pageEditor/slices/editorSlice";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import useReset from "@/pageEditor/hooks/useReset";
import {
  DeploymentContext,
  Metadata,
  PersistedExtension,
  RecipeMetadata,
  RegistryId,
} from "@/core";
import { UnsavedRecipeDefinition } from "@/types/definitions";
import useNotifications from "@/hooks/useNotifications";
import { selectExtensions } from "@/store/extensionsSelectors";
import {
  useCreateRecipeMutation,
  useGetEditablePackagesQuery,
  useGetRecipesQuery,
  useUpdateRecipeMutation,
} from "@/services/api";
import { replaceRecipeExtension } from "./saveHelpers";
import extensionsSlice from "@/store/extensionsSlice";
import pDefer, { DeferredPromise } from "p-defer";
import { PackageUpsertResponse } from "@/types/contract";
import { pick } from "lodash";

const { actions: optionsActions } = extensionsSlice;

export type RecipeConfiguration = {
  id: RegistryId;
  name: string;
  version?: string;
  description?: string;
};

let savingDeferred: DeferredPromise<void>;

export function selectRecipeMetadata(
  unsavedRecipe: UnsavedRecipeDefinition,
  response: PackageUpsertResponse
): RecipeMetadata {
  return {
    ...unsavedRecipe.metadata,
    sharing: pick(response, ["public", "organizations"]),
    ...pick(response, ["updated_at"]),
  };
}

const useSavingWizard = () => {
  const dispatch = useDispatch();
  const create = useCreate();
  const reset = useReset();
  const notify = useNotifications();
  const isWizardOpen = useSelector(selectIsWizardOpen);
  const isSaving = useSelector(selectIsSaving);
  const extensions = useSelector(selectExtensions);
  const elements = useSelector(selectElements);
  const element = useSelector(selectActiveElement);

  const { data: recipes } = useGetRecipesQuery();
  const { data: editablePackages } = useGetEditablePackagesQuery();
  const [createRecipe] = useCreateRecipeMutation();
  const [updateRecipe] = useUpdateRecipeMutation();

  const save = async () => {
    if (!element.recipe) {
      void saveNonRecipeElement();
    }

    savingDeferred = pDefer<void>();

    dispatch(savingExtensionActions.openWizard());
    return savingDeferred.promise;
  };

  /**
   * Saves an extension that is not a part of a Recipe
   */
  const saveNonRecipeElement = async () => {
    dispatch(savingExtensionActions.setSavingInProgress());
    const error = await create({ element, pushToCloud: true });
    closeWizard(error);
  };

  /**
   * Creates personal extension from the existing one
   * It will not be a part of the Recipe
   */
  const saveElementAsPersonalExtension = async () => {
    dispatch(savingExtensionActions.setSavingInProgress());

    // Stripping the recipe-related data from the element
    const { recipe, optionsDefinition, ...rest } = element;
    const personalElement: FormState = {
      ...rest,
      uuid: uuidv4(),
      // Detach from the recipe
      recipe: undefined,
    };

    dispatch(editorActions.addElement(personalElement));
    reset({ element, shouldShowConfirmation: false });
    const error = await create({ element: personalElement, pushToCloud: true });
    if (!error) {
      dispatch(editorActions.removeElement(element.uuid));
      dispatch(optionsActions.removeExtension({ extensionId: element.uuid }));
    }

    closeWizard(error);
  };

  /**
   * 1. Creates new recipe,
   * 2. Updates all extensions of the old recipe to point to the new one, and
   * 3. Saves the changes of the element.
   */
  const saveElementAndCreateNewRecipe = async (
    recipeMeta: RecipeConfiguration
  ) => {
    dispatch(savingExtensionActions.setSavingInProgress());

    const elementRecipeMeta = element.recipe;
    const recipe = recipes.find((x) => x.metadata.id === elementRecipeMeta.id);

    if (recipeMeta.id === recipe.metadata.id) {
      closeWizard("You must provide a new id for the Blueprint");
      return;
    }

    const newMeta: Metadata = {
      ...recipeMeta,
      id: validateRegistryId(recipeMeta.id),
    };

    const newRecipe: UnsavedRecipeDefinition = replaceRecipeExtension(
      recipe,
      newMeta,
      extensions,
      element
    );

    const createRecipeResponse = await createRecipe({
      recipe: newRecipe,
      // Don't share with anyone (only the author will have access)
      organizations: [],
      public: false,
    });

    if ("error" in createRecipeResponse) {
      const errorMessage = "Failed to create new Blueprint";
      notify.error(errorMessage, {
        error: createRecipeResponse.error,
      });
      closeWizard(errorMessage);
      return;
    }

    // `pushToCloud` to false because we don't want to save a copy of the individual extension to the user's account
    // because it will already be available via the blueprint
    const createExtensionError = await create({ element, pushToCloud: false });
    if (createExtensionError) {
      notify.error(createExtensionError);
      closeWizard(createExtensionError);
      return;
    }

    updateExtensionRecipeLinks(
      recipe.metadata.id,
      selectRecipeMetadata(newRecipe, createRecipeResponse.data),
      // Unlink the installed extensions from the deployment
      { _deployment: null as DeploymentContext }
    );

    closeWizard(createExtensionError);
  };

  /**
   * 1. Updates new recipe,
   * 2. Updates all extensions of the recipe with the new metadata, and
   * 3. Saves the changes of the element
   */
  const saveElementAndUpdateRecipe = async (
    recipeMeta: RecipeConfiguration
  ) => {
    dispatch(savingExtensionActions.setSavingInProgress());

    const elementRecipeMeta = element.recipe;
    const recipe = recipes.find((x) => x.metadata.id === elementRecipeMeta.id);

    const newRecipe: UnsavedRecipeDefinition = replaceRecipeExtension(
      recipe,
      recipeMeta,
      extensions,
      element
    );

    const packageId = editablePackages.find(
      // Bricks endpoint uses "name" instead of id
      (x) => x.name === newRecipe.metadata.id
    )?.id;

    const updateRecipeResponse = await updateRecipe({
      packageId,
      recipe: newRecipe,
    });

    if ("error" in updateRecipeResponse) {
      const errorMessage = "Failed to update the Blueprint";
      notify.error(errorMessage, {
        error: updateRecipeResponse.error,
      });
      closeWizard(errorMessage);
      return;
    }

    const error = await create({ element, pushToCloud: true });
    if (error) {
      notify.error(error);
      closeWizard(error);
      return;
    }

    updateExtensionRecipeLinks(
      recipe.metadata.id,
      selectRecipeMetadata(newRecipe, updateRecipeResponse.data)
    );

    closeWizard(error);
  };

  const updateExtensionRecipeLinks = (
    recipeId: RegistryId,
    recipeMetadata: RecipeMetadata,
    extraUpdate: Partial<PersistedExtension> = {}
  ) => {
    // 1) Update the extensions in the Redux optionsSlice
    const recipeExtensions = extensions.filter(
      (x) => x._recipe?.id === recipeId
    );

    for (const recipeExtension of recipeExtensions) {
      const update = {
        id: recipeExtension.id,
        _recipe: recipeMetadata,
        ...extraUpdate,
      };

      dispatch(optionsActions.updateExtension(update));
    }

    // 2) Update the extensions in the Redux editorSlice (the slice for the page editor)
    const recipeElements = elements.filter((x) => x.recipe?.id === recipeId);

    for (const recipeElement of recipeElements) {
      const elementUpdate = {
        uuid: recipeElement.uuid,
        recipe: recipeMetadata,
      };

      dispatch(editorActions.updateElement(elementUpdate));
    }
  };

  const closeWizard = (errorMessage?: string | null) => {
    dispatch(savingExtensionActions.closeWizard());

    if (savingDeferred) {
      if (errorMessage) {
        savingDeferred.reject(errorMessage);
      } else {
        savingDeferred.resolve();
      }

      savingDeferred = null;
    }
  };

  return {
    isWizardOpen,
    isSaving,
    element,
    save,
    saveElementAsPersonalExtension,
    saveElementAndCreateNewRecipe,
    saveElementAndUpdateRecipe,
    closeWizard,
  };
};

export default useSavingWizard;
