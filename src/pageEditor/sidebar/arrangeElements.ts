/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { groupBy, lowerCase, sortBy } from "lodash";
import { type RecipeDefinition } from "@/types/recipeTypes";
import { type FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { getRecipeById } from "@/pageEditor/utils";
import { isExtension } from "@/pageEditor/sidebar/common";
import { type UUID } from "@/types/stringTypes";
import { type IExtension } from "@/types/extensionTypes";
import { type RegistryId } from "@/types/registryTypes";

type ArrangeElementsArgs = {
  elements: FormState[];
  installed: IExtension[];
  recipes: RecipeDefinition[];
  availableInstalledIds: UUID[];
  availableDynamicIds: UUID[];
  activeElementId: UUID | null;
  activeRecipeId: RegistryId | null;
  expandedRecipeId: RegistryId | null;
  query: string;
};

type Element = IExtension | FormState;

function arrangeElements({
  elements,
  installed,
  recipes,
  availableInstalledIds,
  availableDynamicIds,
  activeElementId,
  activeRecipeId,
  expandedRecipeId,
  query,
}: ArrangeElementsArgs): Array<Element | [RegistryId, Element[]]> {
  const elementIds = new Set(elements.map((formState) => formState.uuid));
  const filteredExtensions: IExtension[] = installed.filter(
    (extension) =>
      // Note: we can take out this elementIds filter if and when we persist the editor
      // slice and remove installed extensions when they become dynamic elements
      !elementIds.has(extension.id) &&
      ([expandedRecipeId, activeRecipeId].includes(extension._recipe?.id) ||
        (query.length === 0 && availableInstalledIds?.includes(extension.id)) ||
        (query.length > 0 &&
          lowerCase(extension.label).includes(lowerCase(query))))
  );

  const filteredDynamicElements: FormState[] = elements.filter(
    (formState) =>
      availableDynamicIds?.includes(formState.uuid) ||
      activeElementId === formState.uuid ||
      (query.length === 0 &&
        [expandedRecipeId, activeRecipeId].includes(formState.recipe?.id)) ||
      (query.length > 0 &&
        lowerCase(formState.label).includes(lowerCase(query)))
  );

  const grouped = groupBy(
    [...filteredExtensions, ...filteredDynamicElements],
    (extension) =>
      isExtension(extension) ? extension._recipe?.id : extension.recipe?.id
  );

  const _elementsByRecipeId = new Map<string, Element[]>(
    Object.entries(grouped)
  );
  for (const elements of _elementsByRecipeId.values()) {
    elements.sort((a, b) =>
      lowerCase(a.label).localeCompare(lowerCase(b.label))
    );
  }

  const orphanedElements = _elementsByRecipeId.get("undefined") ?? [];
  _elementsByRecipeId.delete("undefined");
  const unsortedElements = [
    ...(_elementsByRecipeId as Map<RegistryId, Element[]>),
    ...orphanedElements,
  ];

  const sortedElements = sortBy(unsortedElements, (item) => {
    if (!Array.isArray(item)) {
      return lowerCase(item.label);
    }

    const [recipeId, elements] = item;
    const recipe = getRecipeById(recipes, recipeId);
    if (recipe) {
      return lowerCase(recipe?.metadata?.name ?? "");
    }

    // Look for a recipe name in the elements/extensions in case recipes are still loading
    for (const element of elements) {
      const name = isExtension(element)
        ? element._recipe?.name
        : element.recipe?.name;
      if (name) {
        return lowerCase(name);
      }
    }

    return "";
  });

  return sortedElements;
}

export default arrangeElements;
