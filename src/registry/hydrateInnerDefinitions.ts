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

import { produce } from "immer";
import objectHash from "object-hash";
import { cloneDeep, isEmpty, mapValues, pick, pickBy } from "lodash";
import starterBrickRegistry from "@/starterBricks/registry";
import brickRegistry from "@/bricks/registry";
import { fromJS as starterBrickFactory } from "@/starterBricks/factory";
import { fromJS as brickFactory } from "@/bricks/transformers/brickFactory";
import {
  type ModDefinition,
  type HydratedModComponentDefinition,
} from "@/types/modDefinitionTypes";
import { type StarterBrickDefinitionLike } from "@/starterBricks/types";
import { type ReaderConfig } from "@/bricks/types";
import {
  INNER_SCOPE,
  type InnerDefinitions,
  DefinitionKinds,
  type RegistryId,
} from "@/types/registryTypes";
import {
  type ModComponentBase,
  type HydratedModComponent,
} from "@/types/modComponentTypes";
import { type StarterBrick } from "@/types/starterBrickTypes";
import { type Brick } from "@/types/brickTypes";
import { resolveObj } from "@/utils/promiseUtils";
import { isObject } from "@/utils/objectUtils";
import { assertNotNullish } from "@/utils/nullishUtils";

type StarterBrickInnerDefinition = Pick<
  StarterBrickDefinitionLike,
  "definition" | "kind"
>;
type BrickInnerDefinition<
  K extends "component" | "reader" = "component" | "reader",
> = UnknownObject & {
  kind: K;
};

type InnerDefinition = StarterBrickInnerDefinition | BrickInnerDefinition;

/**
 * Calculate the unique id for an inner definition. Definitions with the same structure will produce the same id.
 */
export function calculateInnerRegistryId(obj: UnknownObject): RegistryId {
  const hash = objectHash(obj);
  return `${INNER_SCOPE}/${hash}` as RegistryId;
}

async function hydrateBrickDefinition(
  _definitions: InnerDefinitions,
  innerDefinition: InnerDefinition,
): Promise<Brick> {
  // Don't include outputSchema in because it can't affect functionality
  const obj = pick(innerDefinition, [
    "inputSchema",
    "kind",
    "pipeline",
    "definition",
  ]);
  const registryId = calculateInnerRegistryId(obj);

  try {
    return await brickRegistry.lookup(registryId);
  } catch {
    // Not in registry yet, so add it
  }

  const item = brickFactory(brickRegistry, {
    ...obj,
    metadata: {
      id: registryId,
      name: `Anonymous ${innerDefinition.kind}`,
    },
  });

  brickRegistry.register([item], { source: "internal", notify: false });

  return item;
}

async function hydrateReaderDefinition(
  definitions: InnerDefinitions,
  reader: unknown,
): Promise<ReaderConfig> {
  if (reader == null) {
    throw new TypeError("reader cannot be null/undefined");
  }

  if (typeof reader === "string") {
    if (Object.hasOwn(definitions, reader)) {
      // eslint-disable-next-line security/detect-object-injection -- checked hasOwn
      const definition = definitions[reader];
      if (definition?.kind !== DefinitionKinds.READER) {
        throw new TypeError(
          // Keep extensionPoint terminology because that's what appears in the YAML/JSON
          "extensionPoint references definition that is not a reader",
        );
      }

      const block = await hydrateBrickDefinition(
        definitions,
        definition as BrickInnerDefinition<"component">,
      );
      return block.id;
    }

    // Assume it's a reader config
    return reader as ReaderConfig;
  }

  if (Array.isArray(reader)) {
    return Promise.all(
      reader.map(async (x) => hydrateReaderDefinition(definitions, x)),
    );
  }

  if (isObject(reader)) {
    return resolveObj(
      mapValues(reader, async (x) => hydrateReaderDefinition(definitions, x)),
    );
  }

  console.warn("Unexpected reader definition", {
    reader,
    definitions,
  });

  throw new TypeError("Unexpected reader definition");
}

async function hydrateStarterBrickDefinition(
  definitions: InnerDefinitions,
  originalInnerDefinition: StarterBrickInnerDefinition,
): Promise<StarterBrick> {
  const innerDefinition = cloneDeep(originalInnerDefinition);

  // We have to hydrate the readers before computing the registry id, b/c otherwise different extension points could
  // clash if they use the same name for different readers
  innerDefinition.definition.reader = await hydrateReaderDefinition(
    definitions,
    innerDefinition.definition.reader,
  );

  const obj = pick(innerDefinition, ["kind", "definition"]);
  const internalRegistryId = calculateInnerRegistryId(obj);

  try {
    return await starterBrickRegistry.lookup(internalRegistryId);
  } catch {
    // NOP - will register
  }

  const starterBrick = starterBrickFactory({
    ...obj,
    metadata: {
      id: internalRegistryId,
      name: "Anonymous Starter Brick",
    },
  } as StarterBrickDefinitionLike);

  starterBrickRegistry.register([starterBrick], {
    source: "internal",
    notify: false,
  });

  return starterBrick;
}

/**
 * Ensure inner definitions are registered in the in-memory brick registry
 * @param definitions all of the definitions. Used to hydrate references from innerDefinition
 * @param innerDefinition the inner definition to hydrate
 */
async function hydrateInnerDefinition(
  definitions: InnerDefinitions,
  innerDefinition: InnerDefinitions[string],
): Promise<Brick | StarterBrick> {
  if (typeof innerDefinition.kind !== "string") {
    throw new TypeError("Expected kind of type string for inner definition");
  }

  switch (innerDefinition.kind) {
    case DefinitionKinds.STARTER_BRICK: {
      return hydrateStarterBrickDefinition(
        definitions,
        innerDefinition as StarterBrickInnerDefinition,
      );
    }

    case DefinitionKinds.READER:
    case DefinitionKinds.BRICK: {
      return hydrateBrickDefinition(
        definitions,
        innerDefinition as BrickInnerDefinition,
      );
    }

    default: {
      throw new Error(
        `Invalid kind for inner definition: ${innerDefinition.kind}`,
      );
    }
  }
}

/**
 * Return a new copy of the ModComponentBase with its inner definitions hydrated.
 * TODO: hydrate ids for other definitions (brick, integration, etc.) within the mod component
 */
export async function hydrateModComponentInnerDefinitions<
  T extends UnknownObject = UnknownObject,
>(modComponent: ModComponentBase<T>): Promise<HydratedModComponent<T>> {
  if (isEmpty(modComponent.definitions)) {
    return modComponent as HydratedModComponent<T>;
  }

  return produce(modComponent, async (draft) => {
    const { definitions } = draft;
    assertNotNullish(definitions, "definitions must be defined");
    // The ModComponentBase has definitions for all starterBricks from the mod, even ones it doesn't use
    const relevantDefinitions = pickBy(
      definitions,
      (definition, name) =>
        definition.kind !== DefinitionKinds.STARTER_BRICK ||
        draft.extensionPointId === name,
    );

    const hydratedDefinitions = await resolveObj(
      mapValues(relevantDefinitions, async (definition) =>
        hydrateInnerDefinition(definitions, definition),
      ),
    );

    delete draft.definitions;
    if (hydratedDefinitions[draft.extensionPointId] != null) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- checked above
      draft.extensionPointId = hydratedDefinitions[draft.extensionPointId]!.id;
    }
  }) as Promise<HydratedModComponent<T>>;
}

/**
 * Hydrate inner starter brick definitions.
 * TODO: hydrate other definitions (brick, service, etc.) within the mod definition
 */
export async function hydrateModInnerDefinitions(
  modDefinition:
    | Pick<ModDefinition, "extensionPoints" | "definitions">
    | undefined,
): Promise<HydratedModComponentDefinition[]> {
  const modComponentDefinitions = modDefinition?.extensionPoints;

  if (isEmpty(modDefinition?.definitions)) {
    return modComponentDefinitions as HydratedModComponentDefinition[];
  }

  const starterBrickReferences = new Set<string>(
    modDefinition.extensionPoints.map((x) => x.id),
  );

  // Some mods created with the Page Editor end up with irrelevant definitions in the recipe, because they aren't
  // cleaned up properly on save, etc.
  const relevantDefinitions = pickBy(
    modDefinition.definitions,
    (definition, name) =>
      definition.kind !== DefinitionKinds.STARTER_BRICK ||
      starterBrickReferences.has(name),
  );

  const hydratedDefinitions = await resolveObj(
    mapValues(relevantDefinitions, async (config) =>
      hydrateInnerDefinition(relevantDefinitions, config),
    ),
  );

  return (
    modComponentDefinitions?.map(
      (definition) =>
        (definition.id in hydratedDefinitions
          ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- checked above
            { ...definition, id: hydratedDefinitions[definition.id]!.id }
          : definition) as HydratedModComponentDefinition,
    ) ?? []
  );
}

/**
 * Returns true if the mod component is using an InnerDefinitionRef. _Returns false for HydratedModComponent._
 * @see InnerDefinitionRef
 * @see SerializedModComponent
 * @see HydratedModComponent
 */
export function hasInnerStarterBrickRef(
  modComponent: ModComponentBase,
): boolean {
  // XXX: should this also check for `@internal/` scope in the referenced id? The type ModComponentBase could receive a
  // HydratedModComponent, which would have the id mapped to the internal registry id
  return modComponent.extensionPointId in (modComponent.definitions ?? {});
}
