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
  DefinitionKinds,
  type InnerDefinitionRef,
  type InnerDefinitions,
  type RegistryId,
} from "@/types/registryTypes";
import {
  isInnerDefinitionRegistryId,
  normalizeSemVerString,
  PACKAGE_REGEX,
  validateRegistryId,
} from "@/types/helpers";
import { compact, uniqBy } from "lodash";
import { produce } from "immer";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import {
  DEFAULT_STARTER_BRICK_VAR,
  PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
} from "@/pageEditor/starterBricks/base";
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
  emptyModVariablesDefinitionFactory,
  normalizeModOptionsDefinition,
} from "@/utils/modUtils";
import {
  isStarterBrickDefinitionLike,
  type StarterBrickDefinitionLike,
} from "@/starterBricks/types";
import { isInnerDefinitionEqual } from "@/starterBricks/starterBrickUtils";
import { adapterForComponent } from "@/pageEditor/starterBricks/adapter";
import { mapModComponentBaseToModComponentDefinition } from "@/store/modComponents/modInstanceUtils";
import {
  getDraftModComponentId,
  isModComponentFormState,
} from "@/pageEditor/utils";

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

export type ModParts = {
  /**
   * Mod components to save. These can be dirty or clean.
   */
  draftModComponents: Array<SerializedModComponent | ModComponentFormState>;
  /**
   * The original mod definition, if it exists. Undefined if this is a new mod.
   */
  sourceModDefinition?: ModDefinition;
  /**
   * Dirty/new options to save. Undefined if there are no changes.
   */
  dirtyModOptionsDefinition?: ModOptionsDefinition;
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
    version: normalizeSemVerString("1.0.0"),
  },
  extensionPoints: [],
  definitions: {},
  options: normalizeModOptionsDefinition(null),
  variables: emptyModVariablesDefinitionFactory(),
};

function mapModComponentFormStateToModComponentBase(
  modComponentFormState: ModComponentFormState,
): ModComponentBase {
  const { selectModComponent, selectStarterBrickDefinition } =
    adapterForComponent(modComponentFormState);

  const unsavedModComponent = selectModComponent(modComponentFormState, {
    // Activation-time optionsArgs are not relevant for mod component definitions
    optionsArgs: {},
  });

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
}

/**
 * Create a copy of `sourceMod` (if provided) with given mod metadata, mod options, and mod components.
 *
 * NOTE: the caller is responsible for updating a starter brick package (i.e., that has its own version). This method
 * only handles the starter brick if it's an inner definition
 *
 * @param sourceMod the original mod definition, or undefined for new mods
 * @param draftModComponents the activated mod components/form states to save. Must exclude deleted components
 * @param dirtyModOptionsDefinition the mod's option definition form state, or nullish if there are no dirty options
 * @param dirtyModMetadata the mod's metadata form state, or nullish if there is no dirty mod metadata
 */
export function buildNewMod({
  sourceModDefinition,
  draftModComponents,
  dirtyModOptionsDefinition,
  dirtyModMetadata,
}: ModParts): UnsavedModDefinition {
  // If there's no source mod, then we're creating a new one, so we
  // start with an empty mod definition that will be filled in
  const unsavedModDefinition: UnsavedModDefinition =
    sourceModDefinition ?? emptyModDefinition;

  return produce(unsavedModDefinition, (draft: UnsavedModDefinition): void => {
    if (draftModComponents.length === 0) {
      throw new Error("No mod components to save");
    }

    if (
      draftModComponents.some(
        (x) => x.apiVersion !== unsavedModDefinition.apiVersion,
      )
    ) {
      throw new Error(
        "Runtime API version mismatch between mod definition and mod component definitions. Edit the mod in the the Workshop.",
      );
    }

    if (
      uniqBy(
        draftModComponents.map((x) => getDraftModComponentId(x)),
        (x) => x,
      ).length !== draftModComponents.length
    ) {
      throw new Error("One or more duplicate mod component ids found");
    }

    if (dirtyModOptionsDefinition) {
      draft.options = normalizeModOptionsDefinition(dirtyModOptionsDefinition);
    }

    if (dirtyModMetadata) {
      draft.metadata = dirtyModMetadata;
    }

    const { innerDefinitions, modComponents: extensionPoints } =
      buildModComponents(
        draftModComponents.map((draftModComponent) =>
          isModComponentFormState(draftModComponent)
            ? mapModComponentFormStateToModComponentBase(draftModComponent)
            : draftModComponent,
        ),
      );

    draft.extensionPoints = extensionPoints;
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
    const modComponentDefinition =
      mapModComponentBaseToModComponentDefinition(modComponent);

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
