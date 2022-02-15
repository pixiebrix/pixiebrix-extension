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

import {
  Config,
  EmptyConfig,
  IBlock,
  IExtension,
  IExtensionPoint,
  InnerDefinitions,
  RegistryId,
  ResolvedExtension,
} from "@/core";
import { produce } from "immer";
import objectHash from "object-hash";
import { cloneDeep, isEmpty, isPlainObject, mapValues, pick } from "lodash";
import extensionPointRegistry from "@/extensionPoints/registry";
import blockRegistry from "@/blocks/registry";
import { fromJS as extensionPointFactory } from "@/extensionPoints/factory";
import { fromJS as blockFactory } from "@/blocks/transformers/blockFactory";
import { resolveObj } from "@/utils";
import {
  ExtensionPointConfig as ExtensionDefinition,
  RecipeDefinition,
  ResolvedExtensionPointConfig,
} from "@/types/definitions";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import { ReaderConfig } from "@/blocks/types";
import { UnknownObject } from "@/types";
import { isInnerExtensionPoint } from "@/runtime/runtimeUtils";

type InnerExtensionPoint = Pick<ExtensionPointConfig, "definition" | "kind">;

interface RawConfig<T extends string = string> extends Config {
  kind: T;
}

export function makeInternalId(obj: UnknownObject): RegistryId {
  const hash = objectHash(obj);
  return `@internal/${hash}` as RegistryId;
}

async function ensureBlock(
  definitions: InnerDefinitions,
  config: RawConfig<"reader" | "component">
) {
  // Don't include outputSchema in because it can't affect functionality. Include it in the item in the future?
  const obj = pick(config, ["inputSchema", "kind", "pipeline", "definition"]);
  const registryId = makeInternalId(obj);

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  if (await blockRegistry.exists(registryId)) {
    console.debug(
      `Internal ${obj.kind} already exists: ${registryId}; using existing block`
    );
    return blockRegistry.lookup(registryId);
  }

  const item = blockFactory({
    ...obj,
    metadata: {
      id: registryId,
      name: `Anonymous ${config.kind}`,
    },
  });

  blockRegistry.register(item);

  return item;
}

async function ensureReaders(
  definitions: InnerDefinitions,
  reader: unknown
): Promise<ReaderConfig> {
  if (reader == null) {
    throw new TypeError("reader cannot be null/undefined");
  }

  if (typeof reader === "string") {
    if (Object.prototype.hasOwnProperty.call(definitions, reader)) {
      // eslint-disable-next-line security/detect-object-injection -- checked hasOwnProperty
      const definition = definitions[reader];
      if (definition.kind !== "reader") {
        throw new TypeError(
          "extensionPoint references definition that is not a reader"
        );
      }

      const block = await ensureBlock(
        definitions,
        definition as RawConfig<"reader">
      );
      return block.id;
    }

    // Assume it's a reader config
    return reader as ReaderConfig;
  }

  if (Array.isArray(reader)) {
    return Promise.all(reader.map(async (x) => ensureReaders(definitions, x)));
  }

  if (isPlainObject(reader)) {
    return resolveObj(
      mapValues(reader as Record<string, unknown>, async (x) =>
        ensureReaders(definitions, x)
      )
    );
  }

  console.warn("Unexpected reader definition", {
    reader,
    definitions,
  });

  throw new TypeError("Unexpected reader definition");
}

async function ensureExtensionPoint(
  definitions: InnerDefinitions,
  originalConfig: InnerExtensionPoint
) {
  const config = cloneDeep(originalConfig);

  // We have to resolve the readers before computing the registry id, b/c otherwise different extension points could
  // clash if they use the same name for different readers
  config.definition.reader = await ensureReaders(
    definitions,
    config.definition.reader
  );

  const obj = pick(config, ["kind", "definition"]);
  const registryId = makeInternalId(obj);

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  if (await extensionPointRegistry.exists(registryId)) {
    console.debug(
      `Internal ${obj.kind} already exists: ${registryId}; using existing block`
    );
    return extensionPointRegistry.lookup(registryId);
  }

  const item = extensionPointFactory({
    ...obj,
    metadata: {
      id: registryId,
      name: "Anonymous extensionPoint",
    },
  } as ExtensionPointConfig);

  extensionPointRegistry.register(item);
  return item;
}

async function ensureInner(
  definitions: InnerDefinitions,
  config: Config
): Promise<IBlock | IExtensionPoint> {
  if (typeof config.kind !== "string") {
    throw new TypeError("Expected kind of type string for inner definition");
  }

  switch (config.kind) {
    case "extensionPoint": {
      return ensureExtensionPoint(definitions, config as InnerExtensionPoint);
    }

    case "reader":
    case "component": {
      return ensureBlock(
        definitions,
        config as RawConfig<"reader" | "component">
      );
    }

    default: {
      throw new Error(`Invalid kind for inner definition: ${config.kind}`);
    }
  }
}

/**
 * Return a new copy of the extension with its inner references re-written.
 */
export async function resolveDefinitions<T extends Config = EmptyConfig>(
  extension: IExtension<T>
): Promise<ResolvedExtension<T>> {
  if (isEmpty(extension.definitions)) {
    return extension as ResolvedExtension<T>;
  }

  console.debug("Resolving definitions for extension: %s", extension.id, {
    extension,
  });

  return produce(extension, async (draft) => {
    const ensured = await resolveObj(
      mapValues(draft.definitions, async (config) =>
        ensureInner(draft.definitions, config)
      )
    );
    const definitions = new Map(Object.entries(ensured));
    delete draft.definitions;
    if (definitions.has(draft.extensionPointId)) {
      draft.extensionPointId = definitions.get(draft.extensionPointId).id;
    }
  }) as Promise<ResolvedExtension<T>>;
}

/**
 * Resolve inline extension point definitions.
 *
 * TODO: resolve other definitions within the extensions
 */
export async function resolveRecipe(
  recipe: RecipeDefinition,
  selected: ExtensionDefinition[]
): Promise<ResolvedExtensionPointConfig[]> {
  if (isEmpty(recipe.definitions)) {
    return selected as ResolvedExtensionPointConfig[];
  }

  const ensured = await resolveObj(
    mapValues(recipe.definitions, async (config) =>
      ensureInner(recipe.definitions, config)
    )
  );
  const definitions = new Map(Object.entries(ensured));
  return selected.map(
    (config) =>
      (definitions.has(config.id)
        ? { ...config, id: definitions.get(config.id).id }
        : config) as ResolvedExtensionPointConfig
  );
}

export function hasInnerExtensionPoint(extension: IExtension): boolean {
  const hasInner = extension.extensionPointId in (extension.definitions ?? {});

  if (!hasInner && isInnerExtensionPoint(extension.extensionPointId)) {
    console.warn(
      "Extension is missing inner definition for %s",
      extension.extensionPointId,
      { extension }
    );
  }

  return hasInner;
}
