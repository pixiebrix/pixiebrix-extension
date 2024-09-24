/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
  DefinitionKinds,
  type RegistryId,
} from "@/types/registryTypes";
import {
  isInnerDefinitionRegistryId,
  PACKAGE_REGEX,
  validateRegistryId,
} from "@/types/helpers";
import { compact, pick, sortBy } from "lodash";
import { produce } from "immer";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import {
  DEFAULT_STARTER_BRICK_VAR,
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
  type SerializedModComponent,
} from "@/types/modComponentTypes";
import { type SafeString } from "@/types/stringTypes";
import { type ModMetadataFormState } from "@/pageEditor/store/editor/pageEditorTypes";
import { freshIdentifier } from "@/utils/variableUtils";
import {
  type IntegrationDependency,
  type ModDependencyAPIVersion,
} from "@/integrations/integrationTypes";
import { type Schema } from "@/types/schemaTypes";
import {
  emptyModVariablesDefinitionFactory,
  normalizeModOptionsDefinition,
} from "@/utils/modUtils";
import { INTEGRATIONS_BASE_SCHEMA_URL } from "@/integrations/constants";
import {
  isStarterBrickDefinitionLike,
  type StarterBrickDefinitionLike,
} from "@/starterBricks/types";
import {
  isInnerDefinitionEqual,
  isStarterBrickDefinitionPropEqual,
} from "@/starterBricks/starterBrickUtils";
import { assertNotNullish } from "@/utils/nullishUtils";
import { adapterForComponent } from "@/pageEditor/starterBricks/adapter";

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
    compact([newScope, match?.groups?.collection, match?.groups?.name]).join(
      "/",
    ),
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
  if (modDefinition.metadata.version !== modComponent._recipe?.version) {
    console.warn(
      "Mod component was activated using a different version of the mod",
      {
        modDefinitionVersion: modDefinition.metadata.version,
        modComponentModVersion: modComponent._recipe?.version,
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

  return modDefinition.extensionPoints.findIndex(
    (x) => x.label === modComponent.label,
  );
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
    const { apiVersion } = integrationDependency;
    if (apiVersion && apiVersion > maxApiVersion) {
      maxApiVersion = apiVersion;
    }
  }

  return maxApiVersion;
}

export function selectModComponentIntegrations({
  integrationDependencies,
}: Pick<
  ModComponentBase,
  "integrationDependencies"
>): ModComponentDefinition["services"] {
  const _integrationDependencies = compact(integrationDependencies);
  const apiVersion = findMaxIntegrationDependencyApiVersion(
    _integrationDependencies,
  );
  if (apiVersion === "v1") {
    return Object.fromEntries(
      _integrationDependencies.map((x) => [x.outputKey, x.integrationId]),
    );
  }

  if (apiVersion === "v2") {
    const properties: Record<string, Schema> = {};
    const required: string[] = [];
    for (const {
      outputKey,
      integrationId,
      isOptional,
    } of _integrationDependencies) {
      properties[outputKey] = {
        $ref: `${INTEGRATIONS_BASE_SCHEMA_URL}${integrationId}`,
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

  const exhaustiveCheck: never = apiVersion;
  throw new Error(`Unknown ModDependencyApiVersion: ${exhaustiveCheck}`);
}

/**
 * Deleted unreferenced inner starter brick definitions. Stopgap for logic errors causing unmatched inner definitions
 * in `buildNewMod` and `replaceModComponent`
 */
function deleteUnusedStarterBrickDefinitions(
  innerDefinitions: InnerDefinitions | undefined,
  modComponentDefinitions: ModComponentDefinition[],
) {
  const referencedIds = new Set(modComponentDefinitions.map((x) => x.id));

  for (const [id, definition] of Object.entries(innerDefinitions ?? {})) {
    // Only delete starter brick definitions. In the future, we may complete support for internal brick definitions
    if (isStarterBrickDefinitionLike(definition) && !referencedIds.has(id)) {
      // eslint-disable-next-line security/detect-object-injection, @typescript-eslint/no-non-null-assertion -- from Object.entries
      delete innerDefinitions![id];
    }
  }
}

/**
 * Create a copy of `sourceMod` with `modMetadata` and `modComponent`.
 *
 * NOTE: the caller is responsible for updating a starter brick package (i.e., that has its own version). This method
 * only handles the starter brick if it's an inner definition
 *
 * @param sourceMod the original mod definition
 * @param modMetadata the metadata for the new mod
 * @param activatedModComponents the user's locally activated mod components (i.e., from modComponentsSlice). Used to
 * locate the mod component's position in sourceMod
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
    draft.options = newModComponent.optionsDefinition;
    draft.variables = newModComponent.variablesDefinition;

    if (sourceMod.apiVersion !== newModComponent.apiVersion) {
      const canUpdateModApiVersion = sourceMod.extensionPoints.length <= 1;
      if (canUpdateModApiVersion) {
        draft.apiVersion = newModComponent.apiVersion;

        const starterBrickId = sourceMod.extensionPoints[0]?.id;

        assertNotNullish(
          starterBrickId,
          "First mod component in mod definition has no starter brick",
        );

        // eslint-disable-next-line security/detect-object-injection -- getting a property by mod component id
        const starterBrickDefinition = draft.definitions?.[starterBrickId];

        if (starterBrickDefinition?.apiVersion != null) {
          starterBrickDefinition.apiVersion = newModComponent.apiVersion;
        }
      } else {
        throw new Error(
          `Mod component's API Version (${newModComponent.apiVersion}) does not match mod's API Version (${sourceMod.apiVersion}) and mod's API Version cannot be updated`,
        );
      }
    }

    const modComponentIndex = findModComponentIndex(
      sourceMod,
      activatedModComponent,
    );

    const { selectModComponent, selectStarterBrickDefinition } =
      adapterForComponent(newModComponent);
    const rawModComponent = selectModComponent(newModComponent);
    const starterBrickId = newModComponent.starterBrick.metadata.id;
    const hasInnerDefinition = isInnerDefinitionRegistryId(starterBrickId);

    const commonModComponentDefinition: Except<ModComponentDefinition, "id"> = {
      ...pick(rawModComponent, [
        "label",
        "config",
        "permissions",
        "templateEngine",
      ]),
      services: selectModComponentIntegrations(rawModComponent),
    };

    if (hasInnerDefinition) {
      const starterBrickDefinition =
        selectStarterBrickDefinition(newModComponent);

      const originalInnerId =
        sourceMod.extensionPoints.at(modComponentIndex)?.id;
      assertNotNullish(originalInnerId, "Original inner id not found");
      let newInnerId = originalInnerId;

      assertNotNullish(draft.definitions, "Definitions not found");

      if (
        sourceMod.extensionPoints.filter((x) => x.id === originalInnerId)
          .length > 1
      ) {
        // Multiple mod components share the same inner starter brick definition. If the inner starter brick
        // definition was modified, the behavior we want (at least for now) is to create new starter brick definition
        // instead of modifying the shared entry. If it wasn't modified, we don't have to make any changes.
        if (
          !isStarterBrickDefinitionPropEqual(
            // eslint-disable-next-line security/detect-object-injection -- existing id
            draft.definitions?.[originalInnerId]?.definition,
            starterBrickDefinition.definition,
          )
        ) {
          newInnerId = freshIdentifier(
            "extensionPoint" as SafeString,
            Object.keys(sourceMod?.definitions ?? {}),
          ) as InnerDefinitionRef;
          // eslint-disable-next-line security/detect-object-injection -- generated with freshIdentifier
          draft.definitions[newInnerId] = {
            kind: DefinitionKinds.STARTER_BRICK,
            definition: starterBrickDefinition.definition,
          } satisfies StarterBrickDefinitionLike;
        }
      } else {
        // There's only one, can re-use without breaking the other definition
        // eslint-disable-next-line security/detect-object-injection -- existing id
        draft.definitions[originalInnerId] = {
          kind: DefinitionKinds.STARTER_BRICK,
          definition: starterBrickDefinition.definition,
        } satisfies StarterBrickDefinitionLike;
      }

      // eslint-disable-next-line security/detect-object-injection -- false positive for number
      draft.extensionPoints[modComponentIndex] = {
        id: newInnerId,
        ...commonModComponentDefinition,
      };
    } else {
      // It's not currently possible to switch from using an starter brick package to an inner starter brick
      // definition in the Page Editor. So, we can just use the rawModComponent.extensionPointId directly here.
      // eslint-disable-next-line security/detect-object-injection -- false positive for number
      draft.extensionPoints[modComponentIndex] = {
        id: rawModComponent.extensionPointId,
        ...commonModComponentDefinition,
      };
    }

    deleteUnusedStarterBrickDefinitions(
      draft.definitions,
      draft.extensionPoints,
    );

    return draft;
  });
}

function selectModComponentDefinition(
  modComponent: ModComponentBase,
): ModComponentDefinition {
  return {
    ...pick(modComponent, ["label", "config", "permissions", "templateEngine"]),
    id: modComponent.extensionPointId,
    services: selectModComponentIntegrations(modComponent),
  };
}

export type ModParts = {
  sourceMod?: ModDefinition;
  cleanModComponents: SerializedModComponent[];
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
  kind: DefinitionKinds.MOD,
  metadata: {
    id: "" as RegistryId,
    name: "",
  },
  extensionPoints: [],
  definitions: {},
  options: normalizeModOptionsDefinition(null),
  variables: emptyModVariablesDefinitionFactory(),
};

/**
 * Create a copy of `sourceMod` (if provided) with given mod metadata, mod options, and mod components.
 *
 * NOTE: the caller is responsible for updating an starter brick package (i.e., that has its own version). This method
 * only handles the starter brick if it's an inner definition
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
    if (dirtyModOptions) {
      draft.options = normalizeModOptionsDefinition(dirtyModOptions);
    }

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
      dirtyModComponentFormStates.map((modComponentFormState) => {
        const { selectModComponent, selectStarterBrickDefinition } =
          adapterForComponent(modComponentFormState);

        const unsavedModComponent = selectModComponent(modComponentFormState);

        if (isInnerDefinitionRegistryId(unsavedModComponent.extensionPointId)) {
          const starterBrickConfig = selectStarterBrickDefinition(
            modComponentFormState,
          );
          unsavedModComponent.definitions = {
            [unsavedModComponent.extensionPointId]: {
              kind: DefinitionKinds.STARTER_BRICK,
              definition: starterBrickConfig.definition,
            } satisfies StarterBrickDefinitionLike,
          };
        }

        return unsavedModComponent;
      });

    const { innerDefinitions, modComponents } = buildModComponents([
      ...cleanModComponents,
      ...unsavedModComponents,
    ]);

    // This sorting is mostly for test ergonomics for easier equality assertions when
    // things stay in the same order in this array. The clean/dirty mod components
    // split/recombination logic causes things to get out of order in the result.
    draft.extensionPoints = sortBy(modComponents, (x) => x.id);
    draft.definitions = innerDefinitions;

    // Delete any extra starter brick definitions that might have crept in
    deleteUnusedStarterBrickDefinitions(
      draft.definitions,
      draft.extensionPoints,
    );
  });
}

type BuildModComponentsResult = {
  innerDefinitions: InnerDefinitions;
  modComponents: ModComponentDefinition[];
};

export function buildModComponents(
  modComponents: ModComponentBase[],
): BuildModComponentsResult {
  const definitionsResult: InnerDefinitions = {};
  const componentsResult: ModComponentDefinition[] = [];

  for (const modComponent of modComponents) {
    // When a starter brick id is an @inner/* style reference, or if the id has already been used in the mod,
    // we need to generate a new starter brick id to use instead. If we are changing the starter brick id
    // of the current modComponent, then we need to keep track of this change so that we can build the
    // mod component definition with the correct id
    let newStarterBrickId: RegistryId | InnerDefinitionRef | null = null;

    for (const [
      componentInnerDefinitionId,
      componentInnerDefinition,
    ] of Object.entries(
      // Definitions are currently all starter brick definitions
      modComponent.definitions ?? {},
    )) {
      const currentStarterBrickIds = Object.keys(definitionsResult);

      let isDefinitionAlreadyAdded = false;
      let needsFreshStarterBrickId = false;

      if (isInnerDefinitionRegistryId(componentInnerDefinitionId)) {
        // Always replace inner ids
        needsFreshStarterBrickId = true;

        // Check to see if the definition has already been added under a different id
        const match = Object.entries(definitionsResult).find(([, x]) =>
          isInnerDefinitionEqual(componentInnerDefinition, x),
        );

        if (match) {
          // We found a match in the definitions we've already built
          isDefinitionAlreadyAdded = true;

          // If this definition matches the modComponent's starter brick id,
          // track the id change with our variable declared above.
          if (modComponent.extensionPointId === componentInnerDefinitionId) {
            newStarterBrickId = match[0] as InnerDefinitionRef;
          }
        }
      } else if (currentStarterBrickIds.includes(componentInnerDefinitionId)) {
        // We already used this starter brick id, need to generate a fresh one
        needsFreshStarterBrickId = true;

        if (
          isInnerDefinitionEqual(
            componentInnerDefinition,
            // eslint-disable-next-line security/detect-object-injection -- starter brick id is coming from the modComponent definition entries
            definitionsResult[componentInnerDefinitionId] ?? {},
          )
        ) {
          // Not only has the id been used before, but the definition deeply matches
          // the one being added as well
          isDefinitionAlreadyAdded = true;
        }
      }

      if (isDefinitionAlreadyAdded) {
        // This definition has already been added to the mod, so we can move on
        continue;
      }

      const newInnerId = needsFreshStarterBrickId
        ? freshIdentifier(
            DEFAULT_STARTER_BRICK_VAR as SafeString,
            currentStarterBrickIds,
          )
        : componentInnerDefinitionId;

      // If the definition being added had the same starter brick id as the modComponent,
      // and if we generated a new starter brick id for the definition, then we also
      // need to update the id for the mod component definition we're going to add that references
      // this starter brick definition.
      if (
        needsFreshStarterBrickId &&
        modComponent.extensionPointId === componentInnerDefinitionId
      ) {
        newStarterBrickId = newInnerId as InnerDefinitionRef;
      }

      // eslint-disable-next-line security/detect-object-injection -- we just constructed the id
      definitionsResult[newInnerId] = componentInnerDefinition;
    }

    // Construct the modComponent point config from the modComponent
    const modComponentDefinition = selectModComponentDefinition(modComponent);

    // Add the starter brick, replacing the id with our updated
    // starter brick id, if we've tracked a change in newStarterBrickId
    componentsResult.push({
      ...modComponentDefinition,
      id: newStarterBrickId ?? modComponentDefinition.id,
    });
  }

  return {
    innerDefinitions: definitionsResult,
    modComponents: componentsResult,
  };
}
