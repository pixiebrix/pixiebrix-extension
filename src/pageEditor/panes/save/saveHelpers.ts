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

import {
  type InnerDefinitionRef,
  type InnerDefinitions,
  type Metadata,
  type RegistryId,
} from "@/types/registryTypes";
import {
  isInnerDefinitionRegistryId,
  PACKAGE_REGEX,
  validateRegistryId,
} from "@/types/helpers";
import { compact, isEqual, pick, sortBy } from "lodash";
import { produce } from "immer";
import { ADAPTERS } from "@/pageEditor/starterBricks/adapter";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import {
  DEFAULT_EXTENSION_POINT_VAR,
  PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
} from "@/pageEditor/starterBricks/base";
import { type Except } from "type-fest";
import {
  type ModComponentDefinition,
  type ModDefinition,
  type ModOptionsDefinition,
  type UnsavedModDefinition,
} from "@/types/modDefinitionTypes";
import {
  type ModComponentBase,
  type UnresolvedModComponent,
} from "@/types/modComponentTypes";
import { type SafeString } from "@/types/stringTypes";
import { type ModMetadataFormState } from "@/pageEditor/pageEditorTypes";
import { freshIdentifier } from "@/utils/variableUtils";
import {
  type IntegrationDependency,
  type ModDependencyAPIVersion,
} from "@/integrations/integrationTypes";
import { type Schema } from "@/types/schemaTypes";
import { SERVICES_BASE_SCHEMA_URL } from "@/integrations/util/makeServiceContextFromDependencies";
import {
  isModOptionsSchemaEmpty,
  normalizeModOptionsDefinition,
} from "@/utils/modUtils";

/**
 * Generate a new registry id from an existing registry id by adding/replacing the scope.
 * @param newScope the scope of the author including the "@" prefix (user scope or organization scope)
 * @param sourceId the current registry id
 */
export function generateScopeBrickId(
  newScope: string,
  sourceId: RegistryId,
): RegistryId {
  const match = PACKAGE_REGEX.exec(sourceId);
  return validateRegistryId(
    compact([newScope, match.groups?.collection, match.groups?.name]).join("/"),
  );
}

/**
 * Return the index of the mod component in the mod. Throws an error if a match isn't found.
 *
 * There are a couple corner cases in the mod specification and version handling:
 * - A user modified the mod in the workshop but didn't change the version number
 * - Labels in a mod aren't guaranteed to be unique. However, they generally will be in practice
 *
 * For now, we'll just handle the normal case and send people to the workshop for the corner cases.
 */
function findModComponentIndex(
  modDefinition: ModDefinition,
  modComponent: ModComponentBase,
): number {
  if (modDefinition.metadata.version !== modComponent._recipe.version) {
    console.warn(
      "Mod component was installed using a different version of the mod",
      {
        modDefinitionVersion: modDefinition.metadata.version,
        mocComponentModVersion: modComponent._recipe.version,
      },
    );
  }

  // Labels in the mod aren't guaranteed to be unique
  const labelMatches = modDefinition.extensionPoints.filter(
    (x) => x.label === modComponent.label,
  );

  if (labelMatches.length === 0) {
    throw new Error(
      `There are no starter bricks in the mod with label "${modComponent.label}". You must edit the mod in the Workshop`,
    );
  }

  if (labelMatches.length > 1) {
    throw new Error(
      `There are multiple starter bricks in the mod with label "${modComponent.label}". You must edit the mod in the Workshop`,
    );
  }

  if (labelMatches.length === 1) {
    return modDefinition.extensionPoints.findIndex(
      (x) => x.label === modComponent.label,
    );
  }
}

/**
 * Return the highest API Version used by any of the integrations in the mod. Only exported for testing.
 * @param integrationDependencies mod integration dependencies
 * @since 1.7.37
 * @note This function is just for safety, there's currently no way for a mod to end up with "mixed" integration api versions.
 */
export function findMaxIntegrationDependencyApiVersion(
  integrationDependencies: Array<Pick<IntegrationDependency, "apiVersion">>,
): ModDependencyAPIVersion {
  let maxApiVersion: ModDependencyAPIVersion = "v1";
  for (const integrationDependency of integrationDependencies) {
    if (integrationDependency.apiVersion > maxApiVersion) {
      maxApiVersion = integrationDependency.apiVersion;
    }
  }

  return maxApiVersion;
}

export function selectExtensionPointIntegrations({
  integrationDependencies,
}: Pick<
  ModComponentBase,
  "integrationDependencies"
>): ModComponentDefinition["services"] {
  const apiVersion = findMaxIntegrationDependencyApiVersion(
    integrationDependencies,
  );
  if (apiVersion === "v1") {
    return Object.fromEntries(
      integrationDependencies.map((x) => [x.outputKey, x.integrationId]),
    );
  }

  if (apiVersion === "v2") {
    const properties: Record<string, Schema> = {};
    const required: string[] = [];
    for (const {
      outputKey,
      integrationId,
      isOptional,
    } of integrationDependencies) {
      properties[outputKey] = {
        $ref: `${SERVICES_BASE_SCHEMA_URL}${integrationId}`,
      };
      if (!isOptional) {
        required.push(outputKey);
      }
    }

    return {
      properties,
      required,
    } as Schema;
  }

  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- future-proofing
  throw new Error(`Unknown ModDependencyApiVersion: ${apiVersion}`);
}

/**
 * Create a copy of `sourceMod` with `modMetadata` and `modComponent`.
 *
 * NOTE: the caller is responsible for updating an extensionPoint package (i.e., that has its own version). This method
 * only handles the extensionPoint if it's an inner definition
 *
 * @param sourceMod the original mod
 * @param modMetadata the metadata for the new mod
 * @param activatedModComponents the user's locally activated mod components (i.e., from optionsSlice). Used to locate the
 * mod component's position in sourceMod
 * @param newModComponent the new mod component state (i.e., submitted via Formik)
 */
export function replaceModComponent(
  sourceMod: ModDefinition,
  modMetadata: Metadata,
  activatedModComponents: ModComponentBase[],
  newModComponent: ModComponentFormState,
): UnsavedModDefinition {
  const activatedModComponent = activatedModComponents.find(
    (x) => x.id === newModComponent.uuid,
  );

  if (activatedModComponent == null) {
    throw new Error(
      `Could not find local copy of starter brick: ${newModComponent.uuid}`,
    );
  }

  return produce(sourceMod, (draft: ModDefinition) => {
    draft.metadata = modMetadata;

    if (sourceMod.apiVersion !== newModComponent.apiVersion) {
      const canUpdateModApiVersion = sourceMod.extensionPoints.length <= 1;
      if (canUpdateModApiVersion) {
        draft.apiVersion = newModComponent.apiVersion;

        const extensionPointId = sourceMod.extensionPoints[0]?.id;
        // eslint-disable-next-line security/detect-object-injection -- getting a property by extension id
        const extensionPointDefinition = draft.definitions?.[extensionPointId];

        if (extensionPointDefinition?.apiVersion != null) {
          extensionPointDefinition.apiVersion = newModComponent.apiVersion;
        }
      } else {
        throw new Error(
          `Mod component's API Version (${newModComponent.apiVersion}) does not match mod's API Version (${sourceMod.apiVersion}) and mod's API Version cannot be updated`,
        );
      }
    }

    draft.options = isModOptionsSchemaEmpty(newModComponent.optionsDefinition)
      ? undefined
      : newModComponent.optionsDefinition;

    const modComponentIndex = findModComponentIndex(
      sourceMod,
      activatedModComponent,
    );

    const { selectExtension, selectExtensionPointConfig } = ADAPTERS.get(
      newModComponent.type,
    );
    const rawModComponent = selectExtension(newModComponent);
    const extensionPointId = newModComponent.extensionPoint.metadata.id;
    const hasInnerExtensionPoint =
      isInnerDefinitionRegistryId(extensionPointId);

    const commonModComponentConfig: Except<ModComponentDefinition, "id"> = {
      ...pick(rawModComponent, [
        "label",
        "config",
        "permissions",
        "templateEngine",
      ]),
    };

    // The `services` field is optional, so only add it to the config if the raw
    // mod component has a value. Normalizing here makes testing harder because we
    // then have to account for the normalized value in assertions.
    if (rawModComponent.integrationDependencies) {
      commonModComponentConfig.services =
        selectExtensionPointIntegrations(rawModComponent);
    }

    if (hasInnerExtensionPoint) {
      const extensionPointConfig = selectExtensionPointConfig(newModComponent);

      const originalInnerId =
        sourceMod.extensionPoints.at(modComponentIndex).id;
      let newInnerId = originalInnerId;

      if (
        sourceMod.extensionPoints.filter((x) => x.id === originalInnerId)
          .length > 1
      ) {
        // Multiple mod components share the same inner extension point definition. If the inner extension point
        // definition was modified, the behavior we want (at least for now) is to create new extensionPoint entry
        // instead of modifying the shared entry. If it wasn't modified, we don't have to make any changes.

        // NOTE: there are some non-functional changes (e.g., services being normalized from undefined to {}) that will
        // cause the definitions to not be equal. This is OK for now -- in practice it won't happen for mods
        // originally built using the Page Editor since it produces configs that include the explicit {} and [] objects
        // instead of undefined.
        if (
          !isEqual(
            // eslint-disable-next-line security/detect-object-injection -- existing id
            draft.definitions[originalInnerId].definition,
            extensionPointConfig.definition,
          )
        ) {
          const freshId = freshIdentifier(
            "extensionPoint" as SafeString,
            Object.keys(sourceMod.definitions),
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
      draft.extensionPoints[modComponentIndex] = {
        id: newInnerId,
        ...commonModComponentConfig,
      };
    } else {
      // It's not currently possible to switch from using an extensionPoint package to an inner extensionPoint
      // definition in the Page Editor. So, we can just use the rawModComponent.extensionPointId directly here.
      // eslint-disable-next-line security/detect-object-injection -- false positive for number
      draft.extensionPoints[modComponentIndex] = {
        id: rawModComponent.extensionPointId,
        ...commonModComponentConfig,
      };
    }

    return draft;
  });
}

function selectExtensionPointConfig(
  modComponent: ModComponentBase,
): ModComponentDefinition {
  const extensionPoint: ModComponentDefinition = {
    ...pick(modComponent, ["label", "config", "permissions", "templateEngine"]),
    id: modComponent.extensionPointId,
  };

  // To make round-trip testing easier, don't add a `services` property if it didn't already exist
  if (modComponent.integrationDependencies != null) {
    extensionPoint.services = selectExtensionPointIntegrations(modComponent);
  }

  return extensionPoint;
}

type ModParts = {
  sourceMod?: ModDefinition;
  cleanModComponents: UnresolvedModComponent[];
  dirtyModComponentFormStates: ModComponentFormState[];
  /**
   * Dirty/new options to save. Undefined if there are no changes.
   */
  dirtyModOptions?: ModOptionsDefinition;
  /**
   * Dirty/new metadata to save. Undefined if there are no changes.
   */
  dirtyModMetadata?: ModMetadataFormState;
};

const emptyModDefinition: UnsavedModDefinition = {
  apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
  kind: "recipe",
  metadata: {
    id: "" as RegistryId,
    name: "",
  },
  extensionPoints: [],
  definitions: {},
  options: normalizeModOptionsDefinition(null),
};

/**
 * Create a copy of `sourceMod` (if provided) with given mod metadata, mod options, and mod components.
 *
 * NOTE: the caller is responsible for updating an extensionPoint package (i.e., that has its own version). This method
 * only handles the extensionPoint if it's an inner definition
 *
 * @param sourceMod the original mod definition, or undefined for new mods
 * @param cleanModComponents the mod's unchanged, activated mod components
 * @param dirtyModComponentFormStates the mod's component form states (i.e., submitted via Formik)
 * @param dirtyModOptions the mod's options form state, or nullish if there are no dirty options
 * @param dirtyModMetadata the mod's metadata form state, or nullish if there is no dirty mod metadata
 */
export function buildNewMod({
  sourceMod,
  cleanModComponents,
  dirtyModComponentFormStates,
  dirtyModOptions,
  dirtyModMetadata,
}: ModParts): UnsavedModDefinition {
  // If there's no source mod, then we're creating a new one, so we
  // start with an empty mod definition that will be filled in
  const unsavedModDefinition: UnsavedModDefinition =
    sourceMod ?? emptyModDefinition;

  return produce(unsavedModDefinition, (draft: UnsavedModDefinition): void => {
    // Options dirty state is only populated if a change is made
    if (dirtyModOptions) {
      draft.options = isModOptionsSchemaEmpty(dirtyModOptions)
        ? undefined
        : normalizeModOptionsDefinition(dirtyModOptions);
    }

    // Metadata dirty state is only populated if a change is made
    if (dirtyModMetadata) {
      draft.metadata = dirtyModMetadata;
    }

    const versionedItems = [
      ...cleanModComponents,
      ...dirtyModComponentFormStates,
    ];
    // We need to handle the unlikely edge-case of zero mod components here, hence the null-coalesce
    const itemsApiVersion =
      versionedItems[0]?.apiVersion ?? unsavedModDefinition.apiVersion;
    const badApiVersion = versionedItems.find(
      (item) => item.apiVersion !== itemsApiVersion,
    )?.apiVersion;

    if (badApiVersion) {
      throw new Error(
        `Mod bricks have inconsistent API Versions (${itemsApiVersion}/${badApiVersion}). All bricks in a mod must have the same API Version.`,
      );
    }

    if (itemsApiVersion !== unsavedModDefinition.apiVersion) {
      throw new Error(
        `Mod uses API Version ${unsavedModDefinition.apiVersion}, but it's bricks have version ${itemsApiVersion}. Please use the Workshop to edit this mod.`,
      );
    }

    const unsavedModComponents: ModComponentBase[] =
      dirtyModComponentFormStates.map((modComponentFormStates) => {
        const { selectExtension, selectExtensionPointConfig } = ADAPTERS.get(
          modComponentFormStates.type,
        );
        const unsavedModComponent = selectExtension(modComponentFormStates);

        if (isInnerDefinitionRegistryId(unsavedModComponent.extensionPointId)) {
          const extensionPointConfig = selectExtensionPointConfig(
            modComponentFormStates,
          );
          unsavedModComponent.definitions = {
            [unsavedModComponent.extensionPointId]: {
              kind: "extensionPoint",
              definition: extensionPointConfig.definition,
            },
          };
        }

        return unsavedModComponent;
      });

    const { innerDefinitions, extensionPoints } = buildExtensionPoints([
      ...cleanModComponents,
      ...unsavedModComponents,
    ]);

    // This sorting is mostly for test ergonomics for easier equality assertions when
    // things stay in the same order in this array. The clean/dirty mod components
    // split/recombination logic causes things to get out of order in the result.
    draft.extensionPoints = sortBy(extensionPoints, (x) => x.id);
    draft.definitions = innerDefinitions;
  });
}

type BuildExtensionPointsResult = {
  innerDefinitions: InnerDefinitions;
  extensionPoints: ModComponentDefinition[];
};

function buildExtensionPoints(
  modComponents: ModComponentBase[],
): BuildExtensionPointsResult {
  const innerDefinitions: InnerDefinitions = {};
  const extensionPoints: ModComponentDefinition[] = [];

  for (const modComponent of modComponents) {
    // When an extensionPointId is an @inner/* style reference, or if the
    // id has already been used in the mod, we need to generate a new
    // extensionPointId to use instead. If we are changing the extensionPointId
    // of the current modComponent, then we need to keep track of this change
    // so that we can build the extensionPoint with the correct id.
    let newExtensionPointId: RegistryId | InnerDefinitionRef = null;

    for (const [extensionPointId, definition] of Object.entries(
      modComponent.definitions ?? {},
    )) {
      const usedExtensionPointIds = Object.keys(innerDefinitions);

      let isDefinitionAlreadyAdded = false;
      let needsFreshExtensionPointId = false;

      if (isInnerDefinitionRegistryId(extensionPointId)) {
        // Always replace inner ids
        needsFreshExtensionPointId = true;

        // Check to see if the definition has already been added under a different id
        for (const [id, innerDefinition] of Object.entries(innerDefinitions)) {
          if (isEqual(definition, innerDefinition)) {
            // We found a match in the definitions we've already built
            isDefinitionAlreadyAdded = true;

            // If this definition matches the modComponent's extensionPointId, track
            // the id change with our variable declared above.
            if (modComponent.extensionPointId === extensionPointId) {
              newExtensionPointId = id as InnerDefinitionRef;
            }

            // If we found a matching definition, we don't need to keep searching
            break;
          }
        }
      } else if (usedExtensionPointIds.includes(extensionPointId)) {
        // We already used this extensionPointId, need to generate a fresh one
        needsFreshExtensionPointId = true;

        // eslint-disable-next-line security/detect-object-injection
        if (isEqual(definition, innerDefinitions[extensionPointId])) {
          // Not only has the id been used before, but the definition deeply matches
          // the one being added as well
          isDefinitionAlreadyAdded = true;
        }
      }

      if (isDefinitionAlreadyAdded) {
        // This definition has already been added to the mod, so we can move on
        continue;
      }

      const newInnerId = needsFreshExtensionPointId
        ? freshIdentifier(
            DEFAULT_EXTENSION_POINT_VAR as SafeString,
            usedExtensionPointIds,
          )
        : extensionPointId;

      // If the definition being added had the same extensionPointId as the modComponent,
      // and if we generated a new extensionPointId for the definition, then we also
      // need to update the id for the extensionPoint we're going to add that references
      // this definition.
      if (
        needsFreshExtensionPointId &&
        modComponent.extensionPointId === extensionPointId
      ) {
        newExtensionPointId = newInnerId as InnerDefinitionRef;
      }

      // eslint-disable-next-line security/detect-object-injection -- we just constructed the id
      innerDefinitions[newInnerId] = definition;
    }

    // Construct the modComponent point config from the modComponent
    const extensionPoint = selectExtensionPointConfig(modComponent);

    // Add the extensionPoint, replacing the id with our updated
    // extensionPointId, if we've tracked a change in newExtensionPointId
    extensionPoints.push({
      ...extensionPoint,
      id: newExtensionPointId ?? extensionPoint.id,
    });
  }

  return {
    innerDefinitions,
    extensionPoints,
  };
}
