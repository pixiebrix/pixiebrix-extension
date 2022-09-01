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

import { lowerCase, sortBy } from "lodash";
import { IExtension, RegistryId, UUID } from "@/core";
import { RecipeDefinition } from "@/types/definitions";
import { FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { getRecipeById } from "@/utils";

type ArrangeElementsArgs = {
  elements: FormState[];
  installed: IExtension[];
  recipes: RecipeDefinition[];
  availableInstalledIds: Set<UUID>;
  availableDynamicIds: Set<UUID>;
  showAll: boolean;
  activeElementId: UUID;
  expandedRecipeId: RegistryId | null;
};

type Element = IExtension | FormState;

function arrangeElements({
  elements,
  installed,
  recipes,
  availableInstalledIds,
  availableDynamicIds,
  showAll,
  activeElementId,
  expandedRecipeId,
}: ArrangeElementsArgs): Array<Element | [RegistryId, Element[]]> {
  const elementIds = new Set(elements.map((formState) => formState.uuid));
  const elementsByRecipeId = new Map<
    RegistryId,
    Array<IExtension | FormState>
  >();
  const orphanedElements: Array<IExtension | FormState> = [];
  const filteredExtensions: IExtension[] = installed.filter(
    (extension) =>
      !elementIds.has(extension.id) &&
      (showAll ||
        availableInstalledIds?.has(extension.id) ||
        extension._recipe?.id === expandedRecipeId)
  );
  const filteredDynamicElements: FormState[] = elements.filter(
    (formState) =>
      showAll ||
      availableDynamicIds?.has(formState.uuid) ||
      formState.recipe?.id === expandedRecipeId ||
      activeElementId === formState.uuid
  );

  for (const extension of filteredExtensions) {
    if (extension._recipe) {
      const recipeId = extension._recipe.id;
      if (elementsByRecipeId.has(recipeId)) {
        const recipeElements = elementsByRecipeId.get(recipeId);
        elementsByRecipeId.set(
          recipeId,
          sortBy([extension, ...recipeElements], (element) => element.label)
        );
      } else {
        elementsByRecipeId.set(recipeId, [extension]);
      }
    } else {
      orphanedElements.push(extension);
    }
  }

  for (const element of filteredDynamicElements) {
    if (element.recipe) {
      const recipeId = element.recipe.id;
      if (elementsByRecipeId.has(recipeId)) {
        const recipeElements = elementsByRecipeId.get(recipeId);
        elementsByRecipeId.set(
          recipeId,
          sortBy([element, ...recipeElements], (element) => element.label)
        );
      } else {
        elementsByRecipeId.set(recipeId, [element]);
      }
    } else {
      orphanedElements.push(element);
    }
  }

  const sortedElements = sortBy(
    [...elementsByRecipeId, ...orphanedElements],
    (item) => {
      if (Array.isArray(item)) {
        const recipeId = item[0];
        const recipe = getRecipeById(recipes, recipeId);
        return lowerCase(recipe?.metadata?.name ?? "");
      }

      return lowerCase(item.label);
    }
  );

  return sortedElements;
}

export default arrangeElements;
