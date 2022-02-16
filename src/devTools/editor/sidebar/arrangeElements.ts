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

import { sortBy } from "lodash";
import { IExtension, RegistryId, UUID } from "@/core";
import { FormState } from "@/devTools/editor/slices/editorSlice";
import { RecipeDefinition } from "@/types/definitions";

type ArrangeElementsArgs = {
  elements: FormState[];
  installed: IExtension[];
  recipes: RecipeDefinition[];
  availableInstalledIds: Set<UUID>;
  availableDynamicIds: Set<UUID>;
  showAll: boolean;
  groupByRecipe: boolean;
  activeElementId: UUID;
};

type ArrangeElementsResult = {
  elementsByRecipeId: Array<[RegistryId, Array<IExtension | FormState>]>;
  orphanedElements: Array<IExtension | FormState>;
};

function arrangeElements({
  elements,
  installed,
  recipes,
  availableInstalledIds,
  availableDynamicIds,
  showAll,
  groupByRecipe,
  activeElementId,
}: ArrangeElementsArgs): ArrangeElementsResult {
  const elementIds = new Set(elements.map((formState) => formState.uuid));
  const elementsByRecipeId: Map<
    RegistryId,
    Array<IExtension | FormState>
  > = new Map();
  const orphanedElements: Array<IExtension | FormState> = [];
  const filteredExtensions: IExtension[] = installed.filter(
    (extension) =>
      !elementIds.has(extension.id) &&
      (showAll || availableInstalledIds?.has(extension.id))
  );
  const filteredDynamicElements: FormState[] = elements.filter(
    (formState) =>
      showAll ||
      availableDynamicIds?.has(formState.uuid) ||
      activeElementId === formState.uuid
  );

  for (const extension of filteredExtensions) {
    if (extension._recipe && groupByRecipe) {
      const recipeId = extension._recipe.id;
      if (elementsByRecipeId.has(recipeId)) {
        elementsByRecipeId.get(recipeId).push(extension);
      } else {
        elementsByRecipeId.set(recipeId, [extension]);
      }
    } else {
      orphanedElements.push(extension);
    }
  }

  for (const element of filteredDynamicElements) {
    if (element.recipe && groupByRecipe) {
      const recipeId = element.recipe.id;
      if (elementsByRecipeId.has(recipeId)) {
        elementsByRecipeId.get(recipeId).push(element);
      } else {
        elementsByRecipeId.set(recipeId, [element]);
      }
    } else {
      orphanedElements.push(element);
    }
  }

  return {
    elementsByRecipeId: sortBy(
      [...elementsByRecipeId.entries()],
      ([recipeId]) =>
        recipes?.find((recipe) => recipe.metadata.id === recipeId)?.metadata
          ?.name ?? recipeId
    ),
    orphanedElements: sortBy(orphanedElements, (element) => element.label),
  };
}

export default arrangeElements;
