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

import { produce } from "immer";
import objectHash from "object-hash";
import {
  cloneDeep,
  isEmpty,
  isPlainObject,
  mapValues,
  pick,
  pickBy,
} from "lodash";
import extensionPointRegistry from "@/extensionPoints/registry";
import blockRegistry from "@/blocks/registry";
import { fromJS as extensionPointFactory } from "@/extensionPoints/factory";
import { fromJS as blockFactory } from "@/blocks/transformers/blockFactory";
import { resolveObj } from "@/utils";
import {
  type RecipeDefinition,
  type ResolvedExtensionDefinition,
} from "@/types/recipeTypes";
import { type ExtensionPointConfig } from "@/extensionPoints/types";
import { type ReaderConfig } from "@/blocks/types";
import { type UnknownObject } from "@/types/objectTypes";
import {
  type InnerDefinitionRef,
  type InnerDefinitions,
  type RegistryId,
} from "@/types/registryTypes";
import {
  type IExtension,
  type ResolvedExtension,
} from "@/types/extensionTypes";
import { type IExtensionPoint } from "@/types/extensionPointTypes";
import { type IBlock } from "@/types/blockTypes";

type InnerExtensionPoint = Pick<ExtensionPointConfig, "definition" | "kind">;
type InnerBlock<K extends "component" | "reader" = "component" | "reader"> =
  UnknownObject & {
    kind: K;
  };

type InnerDefinition = InnerExtensionPoint | InnerBlock;

/**
 * Scope for inner definitions
 */
export const INNER_SCOPE = "@internal";

export function makeInternalId(obj: UnknownObject): RegistryId {
  const hash = objectHash(obj);
  return `${INNER_SCOPE}/${hash}` as RegistryId;
}

export function isInnerDefinitionRef(id: string): id is InnerDefinitionRef {
  return id.startsWith(INNER_SCOPE + "/");
}

async function resolveBlockDefinition(
  definitions: InnerDefinitions,
  innerDefinition: InnerDefinition
) {
  // Don't include outputSchema in because it can't affect functionality
  const obj = pick(innerDefinition, [
    "inputSchema",
    "kind",
    "pipeline",
    "definition",
  ]);
  const registryId = makeInternalId(obj);

  try {
    return await blockRegistry.lookup(registryId);
  } catch {
    // Not in registry yet, so add it
  }

  const item = blockFactory({
    ...obj,
    metadata: {
      id: registryId,
      name: `Anonymous ${innerDefinition.kind}`,
    },
  });

  blockRegistry.register([item]);

  return item;
}

async function resolveReaderDefinition(
  definitions: InnerDefinitions,
  reader: unknown
): Promise<ReaderConfig> {
  if (reader == null) {
    throw new TypeError("reader cannot be null/undefined");
  }

  if (typeof reader === "string") {
    if (Object.hasOwn(definitions, reader)) {
      // eslint-disable-next-line security/detect-object-injection -- checked hasOwn
      const definition = definitions[reader];
      if (definition.kind !== "reader") {
        throw new TypeError(
          "extensionPoint references definition that is not a reader"
        );
      }

      const block = await resolveBlockDefinition(
        definitions,
        definition as InnerBlock<"component">
      );
      return block.id;
    }

    // Assume it's a reader config
    return reader as ReaderConfig;
  }

  if (Array.isArray(reader)) {
    return Promise.all(
      reader.map(async (x) => resolveReaderDefinition(definitions, x))
    );
  }

  if (isPlainObject(reader)) {
    return resolveObj(
      mapValues(reader as Record<string, unknown>, async (x) =>
        resolveReaderDefinition(definitions, x)
      )
    );
  }

  console.warn("Unexpected reader definition", {
    reader,
    definitions,
  });

  throw new TypeError("Unexpected reader definition");
}

async function resolveExtensionPointDefinition(
  definitions: InnerDefinitions,
  originalInnerDefinition: InnerExtensionPoint
): Promise<IExtensionPoint> {
  const innerDefinition = cloneDeep(originalInnerDefinition);

  // We have to resolve the readers before computing the registry id, b/c otherwise different extension points could
  // clash if they use the same name for different readers
  innerDefinition.definition.reader = await resolveReaderDefinition(
    definitions,
    innerDefinition.definition.reader
  );

  const obj = pick(innerDefinition, ["kind", "definition"]);
  const internalRegistryId = makeInternalId(obj);

  try {
    return await extensionPointRegistry.lookup(internalRegistryId);
  } catch {
    // NOP - will register
  }

  const item = extensionPointFactory({
    ...obj,
    metadata: {
      id: internalRegistryId,
      name: "Anonymous extensionPoint",
    },
  } as ExtensionPointConfig);

  extensionPointRegistry.register([item]);
  return item;
}

/**
 * Ensure inner definitions are registered in the in-memory brick registry
 * @param definitions all of the definitions. Used to resolve references from innerDefinition
 * @param innerDefinition the inner definition to resolve
 */
async function resolveInnerDefinition(
  definitions: InnerDefinitions,
  innerDefinition: InnerDefinitions[string]
): Promise<IBlock | IExtensionPoint> {
  if (typeof innerDefinition.kind !== "string") {
    throw new TypeError("Expected kind of type string for inner definition");
  }

  switch (innerDefinition.kind) {
    case "extensionPoint": {
      return resolveExtensionPointDefinition(
        definitions,
        innerDefinition as InnerExtensionPoint
      );
    }

    case "reader":
    case "component": {
      return resolveBlockDefinition(definitions, innerDefinition as InnerBlock);
    }

    default: {
      throw new Error(
        `Invalid kind for inner definition: ${innerDefinition.kind}`
      );
    }
  }
}

/**
 * Return a new copy of the IExtension with its inner references re-written.
 */
export async function resolveExtensionInnerDefinitions<
  T extends UnknownObject = UnknownObject
>(extension: IExtension<T>): Promise<ResolvedExtension<T>> {
  if (isEmpty(extension.definitions)) {
    return extension as ResolvedExtension<T>;
  }

  return produce(extension, async (draft) => {
    // The IExtension has definitions for all extensionPoints from the mod, even ones it doesn't use
    const relevantDefinitions = pickBy(
      draft.definitions,
      (definition, name) =>
        (definition.kind === "extensionPoint" &&
          draft.extensionPointId === name) ||
        definition.kind !== "extensionPoint"
    );

    const ensured = await resolveObj(
      mapValues(relevantDefinitions, async (definition) =>
        resolveInnerDefinition(draft.definitions, definition)
      )
    );

    delete draft.definitions;
    if (ensured[draft.extensionPointId] != null) {
      draft.extensionPointId = ensured[draft.extensionPointId].id;
    }
  }) as Promise<ResolvedExtension<T>>;
}

/**
 * Resolve inline extension point definitions.
 * TODO: resolve other definitions (brick, service, etc.) within the extensions
 */
export async function resolveRecipeInnerDefinitions(
  recipe: Pick<RecipeDefinition, "extensionPoints" | "definitions">
): Promise<ResolvedExtensionDefinition[]> {
  const extensionDefinitions = recipe.extensionPoints;

  if (isEmpty(recipe.definitions)) {
    return extensionDefinitions as ResolvedExtensionDefinition[];
  }

  const extensionPointReferences = new Set<string>(
    recipe.extensionPoints.map((x) => x.id)
  );

  // Some mods created with the Page Editor end up with irrelevant definitions in the recipe, because they aren't
  // cleaned up properly on save, etc.
  const relevantDefinitions = pickBy(
    recipe.definitions,
    (definition, name) =>
      (definition.kind === "extensionPoint" &&
        extensionPointReferences.has(name)) ||
      definition.kind !== "extensionPoint"
  );

  const ensured = await resolveObj(
    mapValues(relevantDefinitions, async (config) =>
      resolveInnerDefinition(relevantDefinitions, config)
    )
  );

  return extensionDefinitions.map(
    (definition) =>
      (definition.id in ensured
        ? { ...definition, id: ensured[definition.id].id }
        : definition) as ResolvedExtensionDefinition
  );
}

export function hasInnerExtensionPoint(extension: IExtension): boolean {
  const hasInner = extension.extensionPointId in (extension.definitions ?? {});

  if (!hasInner && isInnerDefinitionRef(extension.extensionPointId)) {
    console.warn(
      "Extension is missing inner definition for %s",
      extension.extensionPointId,
      { extension }
    );
  }

  return hasInner;
}
