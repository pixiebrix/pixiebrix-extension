/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import {
  RegistryId,
  Metadata,
  IExtension,
  SafeString,
  InnerDefinitionRef,
} from "@/core";
import {
  EditablePackage,
  RecipeDefinition,
  UnsavedRecipeDefinition,
} from "@/types/definitions";
import { PACKAGE_REGEX, validateRegistryId } from "@/types/helpers";
import { compact, isEmpty, isEqual, pick } from "lodash";
import { FormState } from "@/devTools/editor/slices/editorSlice";
import { nothing, produce } from "immer";
import { ADAPTERS } from "@/devTools/editor/extensionPoints/adapter";
import { freshIdentifier } from "@/utils";
import { isInnerExtensionPoint } from "@/runtime/runtimeUtils";

/**
 * Generate a new registry id from an existing registry id by adding/replacing the scope.
 * @param newScope the scope of the author including the "@" prefix (user scope or organization scope)
 * @param sourceId the current registry id
 */
export function generateScopeBrickId(
  newScope: string,
  sourceId: RegistryId
): RegistryId {
  const match = PACKAGE_REGEX.exec(sourceId);
  return validateRegistryId(
    compact([newScope, match.groups?.collection, match.groups?.name]).join("/")
  );
}

export function isRecipeEditable(
  editablePackages: EditablePackage[],
  recipe: RecipeDefinition
) {
  return editablePackages.some((x) => x.name === recipe.metadata.id);
}

/**
 * Return the index of the extension in the recipe. Throws an error if a match isn't found.
 *
 * There are a couple corner cases in the recipe specification and version handling:
 * - A user modified the recipe in the workshop but didn't change the version number of the recipe
 * - Labels in a recipe aren't guaranteed to be unique. However, they generally will be in practice
 *
 * For now, we'll just handle the normal case and send people to the workshop for the corner cases.
 */
function findRecipeIndex(
  sourceRecipe: RecipeDefinition,
  extension: IExtension
): number {
  if (sourceRecipe.metadata.version !== extension._recipe.version) {
    console.warn(
      "Extension was installed using a different version of the recipe",
      {
        recipeVersion: sourceRecipe.metadata.version,
        extensionVersion: extension._recipe.version,
      }
    );
  }

  // Labels in the recipe aren't guaranteed to be unique
  const labelMatches = sourceRecipe.extensionPoints.filter(
    (x) => x.label === extension.label
  );

  if (labelMatches.length === 0) {
    throw new Error(
      `There are no extensions in the blueprint with label "${extension.label}". You must edit the blueprint in the Workshop`
    );
  }

  if (labelMatches.length > 1) {
    throw new Error(
      `There are multiple extensions in the blueprint with label "${extension.label}". You must edit the blueprint in the Workshop`
    );
  }

  if (labelMatches.length === 1) {
    return sourceRecipe.extensionPoints.findIndex(
      (x) => x.label === extension.label
    );
  }
}

/**
 * Create a copy of `sourceRecipe` with `metadata` and `element`.
 *
 * NOTE: the caller is responsible for updating an extensionPoint package (i.e., that has its own version). This method
 * only handles the extensionPoint if it's an inner definition
 *
 * @param sourceRecipe the original recipe
 * @param metadata the metadata for the new recipe
 * @param installedExtensions the user's locally installed extensions (i.e., from optionsSlice). Used to locate the
 * element's position in sourceRecipe
 * @param element the new extension state (i.e., submitted via Formik)
 */
export function replaceRecipeExtension(
  sourceRecipe: RecipeDefinition,
  metadata: Metadata,
  installedExtensions: IExtension[],
  element: FormState
): UnsavedRecipeDefinition {
  const installedExtension = installedExtensions.find(
    (x) => x.id === element.uuid
  );

  if (installedExtension == null) {
    throw new Error(
      `Could not find local copy of recipe extension: ${element.uuid}`
    );
  }

  return produce(sourceRecipe, (draft) => {
    draft.metadata = metadata;

    if (sourceRecipe.apiVersion !== element.apiVersion) {
      const canUpdateRecipeApiVersion =
        sourceRecipe.extensionPoints.length <= 1;
      if (canUpdateRecipeApiVersion) {
        draft.apiVersion = element.apiVersion;

        const extensionPointId = sourceRecipe.extensionPoints[0]?.id;
        // eslint-disable-next-line security/detect-object-injection -- getting a property by extension id
        const extensionPointDefinition = draft.definitions?.[extensionPointId];

        if (extensionPointDefinition?.apiVersion != null) {
          extensionPointDefinition.apiVersion = element.apiVersion;
        }
      } else {
        throw new Error(
          `Element's API Version (${element.apiVersion}) does not match recipe's API Version (${sourceRecipe.apiVersion}) and recipe's API Version cannot be updated`
        );
      }
    }

    if (isEmpty(element.optionsDefinition?.schema?.properties)) {
      draft.options = undefined;
    } else {
      draft.options = element.optionsDefinition;
    }

    const index = findRecipeIndex(sourceRecipe, installedExtension);

    const adapter = ADAPTERS.get(element.type);
    const rawExtension = adapter.selectExtension(element);
    const extensionPointId = element.extensionPoint.metadata.id;
    const hasInnerExtensionPoint = isInnerExtensionPoint(extensionPointId);

    const commonExtensionConfig = {
      ...pick(rawExtension, [
        "label",
        "config",
        "permissions",
        "templateEngine",
      ]),
      services: Object.fromEntries(
        rawExtension.services.map((x) => [x.outputKey, x.id])
      ),
    };

    if (hasInnerExtensionPoint) {
      const extensionPointConfig = adapter.selectExtensionPoint(element);

      // eslint-disable-next-line security/detect-object-injection -- false positive for number
      const originalInnerId = sourceRecipe.extensionPoints[index].id;
      let newInnerId = originalInnerId;

      if (
        sourceRecipe.extensionPoints.filter((x) => x.id === originalInnerId)
          .length > 1
      ) {
        // Multiple extensions share the same inner extension point definition. If the inner extension point definition
        // was modified, the behavior we want (at least for now) is to create new extensionPoint entry instead of
        // modifying the shared entry. If we wasn't modified, we don't have to make any changes.

        // NOTE: there are some non-functional changes (e.g., services being normalized from undefined to {}) that will
        // cause the definitions to not be equal. This is OK for now -- in practice it won't happen for blueprints
        // originally built using the Page Editor since it produces configs that include the explicit {} and [] objects
        // instead of undefined.
        if (
          !isEqual(
            // eslint-disable-next-line security/detect-object-injection -- existing id
            draft.definitions[originalInnerId].definition,
            extensionPointConfig.definition
          )
        ) {
          const freshId = freshIdentifier(
            "extensionPoint" as SafeString,
            Object.keys(sourceRecipe.definitions)
          ) as InnerDefinitionRef;
          newInnerId = freshId;
          // eslint-disable-next-line security/detect-object-injection -- generated with freshIdentifier
          draft.definitions[freshId] = {
            kind: "extensionPoint",
            definition: extensionPointConfig.definition,
          };
        }
      } else {
        // There's only one, can re-use without breaking the other definition
        // eslint-disable-next-line security/detect-object-injection -- existing id
        draft.definitions[originalInnerId] = {
          kind: "extensionPoint",
          definition: extensionPointConfig.definition,
        };
      }

      // eslint-disable-next-line security/detect-object-injection -- false positive for number
      draft.extensionPoints[index] = {
        id: newInnerId,
        ...commonExtensionConfig,
      };
    } else {
      // It's not currently possible to switch from using an extensionPoint package to an inner extensionPoint
      // definition in the Page Editor. Therefore we can just use the rawExtension.extensionPointId directly here.
      // eslint-disable-next-line security/detect-object-injection -- false positive for number
      draft.extensionPoints[index] = {
        id: rawExtension.extensionPointId,
        ...commonExtensionConfig,
      };
    }

    return draft;
  });
}
