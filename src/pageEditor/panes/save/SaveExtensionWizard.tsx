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

import React, { useRef, useState } from "react";
import {
  useGetRecipesQuery,
  useGetEditablePackagesQuery,
} from "@/services/api";
import { validateRegistryId } from "@/types/helpers";
import SavingInProgressModal from "./SavingInProgressModal";
import LoadingDataModal from "./LoadingDataModal";
import { generateScopeBrickId, isRecipeEditable } from "./saveHelpers";
import useSavingWizard from "./useSavingWizard";
import SavingExtensionModal from "./SavingExtensionModal";
import RecipeConfigurationModal, {
  RecipeConfiguration,
} from "./RecipeConfigurationModal";
import { selectScope } from "@/auth/authSelectors";
import { useSelector } from "react-redux";

const SaveExtensionWizard: React.FC = () => {
  const {
    isSaving,
    element,
    saveElementAsPersonalExtension,
    saveElementAndCreateNewRecipe,
    saveElementAndUpdateRecipe,
    closeWizard,
  } = useSavingWizard();
  const scope = useSelector(selectScope);
  const { data: recipes, isLoading: areRecipesLoading } = useGetRecipesQuery();
  const { data: editablePackages, isLoading: areEditablePackageLoading } =
    useGetEditablePackagesQuery();
  const [isRecipeOptionsModalShown, setRecipeOptionsModalShown] =
    useState(false);
  const isNewRecipe = useRef(false);
  const newRecipeInitialValues = useRef<RecipeConfiguration>(null);

  if (isSaving) {
    return <SavingInProgressModal />;
  }

  if (areRecipesLoading || areEditablePackageLoading) {
    return <LoadingDataModal onClose={closeWizard} />;
  }

  const elementRecipeMeta = element.recipe;
  const recipe = recipes.find((x) => x.metadata.id === elementRecipeMeta.id);

  const showCreateRecipeModal = () => {
    isNewRecipe.current = true;
    const newRecipeId = generateScopeBrickId(scope, recipe.metadata.id);
    newRecipeInitialValues.current = {
      id: validateRegistryId(newRecipeId),
      name: `Copy of ${elementRecipeMeta.name}`,
      version: elementRecipeMeta.version,
      description: elementRecipeMeta.description,
    };

    setRecipeOptionsModalShown(true);
  };

  const showUpdateRecipeModal = () => {
    isNewRecipe.current = false;
    newRecipeInitialValues.current = elementRecipeMeta;

    setRecipeOptionsModalShown(true);
  };

  const saveRecipeAndExtension = (recipeMeta: RecipeConfiguration) => {
    if (isNewRecipe.current) {
      void saveElementAndCreateNewRecipe(recipeMeta);
    } else {
      void saveElementAndUpdateRecipe(recipeMeta);
    }
  };

  return isRecipeOptionsModalShown ? (
    <RecipeConfigurationModal
      initialValues={newRecipeInitialValues.current}
      isNewRecipe={isNewRecipe.current}
      close={closeWizard}
      navigateBack={() => {
        setRecipeOptionsModalShown(false);
      }}
      save={saveRecipeAndExtension}
    />
  ) : (
    <SavingExtensionModal
      recipe={recipe}
      element={element}
      isRecipeEditable={isRecipeEditable(editablePackages, recipe)}
      close={closeWizard}
      saveAsPersonalExtension={saveElementAsPersonalExtension}
      showCreateRecipeModal={showCreateRecipeModal}
      showUpdateRecipeModal={showUpdateRecipeModal}
    />
  );
};

export default SaveExtensionWizard;
