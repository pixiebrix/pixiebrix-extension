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

import Alert from "@/components/Alert";
import { appApi } from "@/services/api";
import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/pageEditor/pageEditorTypes";
import { selectExtensions } from "@/store/extensionsSelectors";

const OldBlueprintWarning: React.FunctionComponent = () => {
  const recipeId = useSelector<RootState>(
    ({ editor }) => editor.activeRecipeId
  );

  const { data: recipes = [] } = appApi.endpoints.getRecipes.useQueryState();
  const recipe = recipes.find((x) => x.metadata.id === recipeId);

  // Select a single extension for the recipe to check the installed version.
  // We rely on the assumption that every extension in the recipe has the same version.
  const recipeExtension = useSelector(selectExtensions).find(
    (x) => x._recipe?.id === recipeId
  );

  const installedRecipeVersion = recipeExtension?._recipe.version;
  const latestRecipeVersion = recipe?.metadata?.version;

  if (installedRecipeVersion === latestRecipeVersion) {
    return null;
  }

  return (
    <Alert variant="warning">
      You are editing version {installedRecipeVersion} of this blueprint, the
      latest version is {latestRecipeVersion}. To get the latest version,{" "}
      <a
        href="/options.html#/blueprints"
        target="_blank"
        title="Re-activate the blueprint"
      >
        re-activate the blueprint
      </a>
    </Alert>
  );
};

export default OldBlueprintWarning;
