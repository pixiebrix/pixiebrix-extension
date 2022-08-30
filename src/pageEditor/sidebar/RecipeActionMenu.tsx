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

import React from "react";
import { RegistryId } from "@/core";
import { useSelector } from "react-redux";
import { selectRecipeIsDirty } from "@/pageEditor/slices/editorSelectors";
import ActionMenu from "@/components/sidebar/ActionMenu";

type RecipeActionMenuProps = {
  recipeId: RegistryId;
  saveRecipe: (recipeId: RegistryId) => Promise<void>;
  isSavingRecipe: boolean;
  resetRecipe: (recipeId: RegistryId) => Promise<void>;
  removeRecipe: (recipeId: RegistryId) => Promise<void>;
};

const RecipeActionMenu: React.FC<RecipeActionMenuProps> = ({
  recipeId,
  saveRecipe,
  isSavingRecipe,
  resetRecipe,
  removeRecipe,
}) => {
  const isDirty = useSelector(selectRecipeIsDirty(recipeId));

  return (
    <ActionMenu
      onRemove={async () => {
        await removeRecipe(recipeId);
      }}
      onSave={async () => {
        await saveRecipe(recipeId);
      }}
      onReset={async () => {
        await resetRecipe(recipeId);
      }}
      isDirty={isDirty}
      disabled={isSavingRecipe}
    />
  );
};

export default RecipeActionMenu;
