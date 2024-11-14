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
  type ModDefinition,
  type ModOptionsDefinition,
  type ModVariablesDefinition,
  type UnsavedModDefinition,
} from "@/types/modDefinitionTypes";
import { type Mod, type UnavailableMod } from "@/types/modTypes";
import {
  type HydratedModComponent,
  type ModComponentRef,
  type ModMetadata,
} from "@/types/modComponentTypes";
import {
  DefinitionKinds,
  INNER_SCOPE,
  type RegistryId,
} from "@/types/registryTypes";
import { type Nullishable } from "./nullishUtils";
import {
  minimalSchemaFactory,
  minimalUiSchemaFactory,
  propertiesToSchema,
} from "@/utils/schemaUtils";
import { cloneDeep, isEmpty, mapValues, sortBy } from "lodash";
import { isNullOrBlank } from "@/utils/stringUtils";
import {
  type Schema,
  type SchemaProperties,
  type UiSchema,
} from "@/types/schemaTypes";
import { produce } from "immer";
import { isStarterBrickDefinitionLike } from "@/starterBricks/types";
import { normalizeStarterBrickDefinitionProp } from "@/starterBricks/starterBrickUtils";
import { type MessageContext } from "@/types/loggerTypes";
import { type SetRequired } from "type-fest";
import {
  normalizeSemVerString,
  uuidv4,
  validateRegistryId,
} from "@/types/helpers";
import { nowTimestamp } from "@/utils/timeUtils";
import { type ModInstance } from "@/types/modInstanceTypes";
import { createPrivateSharing } from "@/utils/registryUtils";

/**
 * Returns the ModComponentRef for a given mod component.
 * @see mapMessageContextToModComponentRef
 */
export function getModComponentRef(
  // Must be HydratedModComponent so `extensionPointId` points to a registryId
  modComponent: HydratedModComponent,
): ModComponentRef {
  return {
    modComponentId: modComponent.id,
    modId: modComponent.modMetadata.id,
    starterBrickId: modComponent.extensionPointId,
  };
}

/**
 * Returns the MessageContext associated with `modComponent`.
 * @see mapMessageContextToModComponentRef
 */
export function mapModComponentToMessageContext(
  modComponent: HydratedModComponent,
): MessageContext {
  return {
    // The step label will be re-assigned later in reducePipeline
    label: modComponent.label ?? undefined,
    modComponentLabel: modComponent.label ?? undefined,
    modComponentId: modComponent.id,
    starterBrickId: modComponent.extensionPointId,
    deploymentId: modComponent.deploymentMetadata?.id,
    modId: modComponent.modMetadata.id,
    modVersion: modComponent.modMetadata.version,
  };
}

/**
 * Returns the message context for a ModComponentRef. For use with passing to reportEvent
 * @see selectEventData
 */
export function mapModComponentRefToMessageContext(
  modComponentRef: ModComponentRef,
): SetRequired<MessageContext, "modComponentId" | "starterBrickId" | "modId"> {
  // Fields are currently named the same. In the future, the fields might temporarily diverge.
  return {
    modComponentId: modComponentRef.modComponentId,
    starterBrickId: modComponentRef.starterBrickId,
    modId: modComponentRef.modId,
  };
}

/**
 * Returns true if the mod is an UnavailableMod, i.e., a mod the user no longer has access to.
 * @see UnavailableMod
 */
export function isUnavailableMod(mod: Mod): mod is UnavailableMod {
  return "isStub" in mod && mod.isStub;
}

export function idHasScope(
  id: RegistryId,
  scope: Nullishable<string>,
): boolean {
  return scope != null && id.startsWith(scope + "/");
}

/**
 * Returns a minimal mod options definition in a normalized format.
 */
export function emptyModOptionsDefinitionFactory(): Required<ModOptionsDefinition> {
  return {
    schema: minimalSchemaFactory(),
    uiSchema: minimalUiSchemaFactory(),
  };
}

/**
 * Returns a minimal mod variables definition in a normalized format.
 */
export function emptyModVariablesDefinitionFactory(): Required<ModVariablesDefinition> {
  return {
    // An object schema with no properties allows additionalProperties: true by default
    schema: minimalSchemaFactory(),
  };
}

/**
 * Normalize the `options` section of a mod definition, ensuring that it has a schema and uiSchema.
 * @since 1.8.5
 */
export function normalizeModOptionsDefinition(
  optionsDefinition: ModDefinition["options"] | null,
): NonNullable<Required<ModDefinition["options"]>> {
  if (!optionsDefinition) {
    return emptyModOptionsDefinitionFactory();
  }

  const modDefinitionSchema = optionsDefinition.schema ?? {};
  const schema: Schema =
    "type" in modDefinitionSchema &&
    modDefinitionSchema.type === "object" &&
    "properties" in modDefinitionSchema
      ? modDefinitionSchema
      : // Handle case where schema is just the properties. That's the old format. Technically, this isn't possible
        // given the type signature. But be defensive because this method processes user-defined mod definitions.
        propertiesToSchema(
          modDefinitionSchema as SchemaProperties,
          Object.keys(modDefinitionSchema as SchemaProperties),
        );

  const uiSchema: UiSchema = cloneDeep(optionsDefinition.uiSchema ?? {});

  uiSchema["ui:order"] ??= [
    ...sortBy(Object.keys(schema.properties ?? {})),
    "*",
  ];

  return {
    schema,
    uiSchema,
  };
}

/**
 * Returns true if the mod definition any defined options.
 */
export function hasDefinedModOptions(modDefinition: ModDefinition): boolean {
  return !isEmpty(
    normalizeModOptionsDefinition(modDefinition.options).schema.properties,
  );
}

/**
 * Return the activation instructions for a mod as markdown, or null if there are none.
 */
export function getModActivationInstructions(
  modDefinition: ModDefinition,
): string | null {
  const description: string | undefined =
    // Be defensive -- technically schema is required if options exists
    modDefinition.options?.schema?.description;

  if (!description) {
    return null;
  }

  return isNullOrBlank(description) ? null : description.trim();
}

/**
 * Normalize the shape of a mod definition (e.g., for roundtrip test assertions).
 * @internal
 */
export function normalizeModDefinition<
  T extends UnsavedModDefinition = UnsavedModDefinition,
>(definition: T): T {
  return produce(definition, (draft) => {
    draft.options = normalizeModOptionsDefinition(
      draft.options as ModDefinition["options"] | null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- type error due to nested readonly string array
    ) as any;
    draft.variables ??= emptyModVariablesDefinitionFactory();
    draft.definitions = mapValues(
      draft.definitions ?? {},
      (innerDefinition) => {
        if (isStarterBrickDefinitionLike(innerDefinition)) {
          return {
            ...innerDefinition,
            definition: normalizeStarterBrickDefinitionProp(
              innerDefinition.definition,
            ),
          };
        }

        return innerDefinition;
      },
    );
  });
}

export function mapModInstanceToUnavailableMod(
  modInstance: ModInstance,
): UnavailableMod {
  return {
    metadata: modInstance.definition.metadata,
    kind: DefinitionKinds.MOD,
    isStub: true,
    updated_at: modInstance.definition.updated_at,
    sharing: modInstance.definition.sharing,
  };
}

/**
 * Generate a temporary, "unsaved" mod metadata
 * @param name the name of the mod
 */
export function createNewUnsavedModMetadata({
  modName,
}: {
  modName: string;
}): ModMetadata {
  const randomId = uuidv4();
  return {
    id: validateRegistryId(`${INNER_SCOPE}/mod/${randomId.toLowerCase()}`),
    name: modName,
    description: "Created with the PixieBrix Page Editor",
    version: normalizeSemVerString("1.0.0"),
    sharing: createPrivateSharing(),
    updated_at: nowTimestamp(),
  };
}
