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
  EmptyConfig,
  IExtension,
  Metadata,
  RegistryId,
  selectMetadata,
  UUID,
} from "@/core";
import { Framework, FrameworkMeta, KNOWN_READERS } from "@/messaging/constants";
import { castArray, isPlainObject } from "lodash";
import brickRegistry from "@/blocks/registry";
import { ReaderConfig, ReaderReference } from "@/blocks/readers/factory";
import {
  defaultSelector,
  readerOptions,
} from "@/devTools/editor/tabs/reader/ReaderConfig";
import {
  ExtensionPointConfig,
  ExtensionPointDefinition,
} from "@/extensionPoints/types";
import { find as findBrick } from "@/registry/localRegistry";
import React from "react";
import { createSitePattern, getDomain } from "@/permissions/patterns";
import {
  BaseFormState,
  isCustomReader,
  ReaderFormState,
  ReaderReferenceFormState,
} from "@/devTools/editor/extensionPoints/elementConfig";
import { Except } from "type-fest";
import { validateRegistryId } from "@/types/helpers";

export interface WizardStep {
  step: string;
  Component: React.FunctionComponent<{
    eventKey: string;
    editable?: Set<string>;
    available?: boolean;
  }>;
  extraProps?: Record<string, unknown>;
}

function defaultReader(frameworks: FrameworkMeta[]): Framework {
  const knownFrameworks = (frameworks ?? []).filter((x) =>
    KNOWN_READERS.includes(x.id)
  );
  return knownFrameworks.length > 0 ? knownFrameworks[0].id : "jquery";
}

export function makeIsAvailable(
  url: string
): { matchPatterns: string; selectors: string | null } {
  return {
    matchPatterns: createSitePattern(url),
    selectors: null,
  };
}

export function makeReaderId(
  foundationId: string,
  excludeIds: string[] = []
): RegistryId {
  const base = `${foundationId}-reader`;
  if (!excludeIds.includes(base)) {
    return validateRegistryId(base);
  }

  let num = 1;
  let id: string;
  do {
    num++;
    id = `${base}-${num}`;
  } while (excludeIds.includes(id));

  return validateRegistryId(id);
}

interface ReaderOptions {
  defaultSelector?: string;
  reservedIds?: string[];
  name?: string;
}

export function makeDefaultReader(
  metadata: Metadata,
  frameworks: FrameworkMeta[],
  { defaultSelector, reservedIds, name }: ReaderOptions = {
    defaultSelector: undefined,
    reservedIds: [],
  }
): ReaderFormState {
  return {
    metadata: {
      id: makeReaderId(metadata.id, reservedIds),
      name: name ?? `Default reader for ${metadata.id}`,
    },
    outputSchema: {},
    definition: {
      type: defaultReader(frameworks),
      selector: defaultSelector,
      optional: false,
      selectors: {},
    },
  };
}

export function makeBaseState(
  uuid: UUID,
  defaultSelector: string | null,
  metadata: Metadata,
  frameworks: FrameworkMeta[]
): Except<BaseFormState, "type" | "label" | "extensionPoint"> {
  return {
    uuid,
    services: [],
    readers: [makeDefaultReader(metadata, frameworks, { defaultSelector })],
    extension: {},
  };
}

export async function generateExtensionPointMetadata(
  label: string,
  scope: string,
  url: string,
  reservedNames: string[]
): Promise<Metadata> {
  const domain = getDomain(url);

  await brickRegistry.fetch();

  const allowId = async (id: RegistryId) => {
    if (!reservedNames.includes(id)) {
      try {
        await brickRegistry.lookup(id);
      } catch {
        // Name doesn't exist yet
        return true;
      }
    }

    return false;
  };

  // Find next available foundation id
  const collection = `${scope ?? "@local"}/${domain}`;
  for (let index = 1; index < 1000; index++) {
    const id = validateRegistryId(
      [collection, index === 1 ? "foundation" : `foundation-${index}`].join("/")
    );

    // Can't parallelize loop because we're looking for first alternative
    const ok = (await Promise.all([allowId(id), allowId(makeReaderId(id))])) // eslint-disable-line no-await-in-loop
      .every((allowed) => allowed);

    if (ok) {
      return {
        id: validateRegistryId(id),
        name: `${domain} ${label}`,
      };
    }
  }

  throw new Error("Could not find available id");
}

export function makeExtensionReaders({
  readers,
}: BaseFormState): Array<ReaderConfig | ReaderReference> {
  return readers.map((reader) => {
    if (!isCustomReader(reader)) {
      return { metadata: reader.metadata };
    }

    const { metadata, definition, outputSchema = {} } = reader;

    const readerOption = readerOptions.find((x) => x.value === definition.type);

    return {
      apiVersion: "v1",
      kind: "reader",
      metadata: {
        id: metadata.id,
        name: metadata.name,
        version: "1.0.0",
        description: "Reader created with the Page Editor",
      },
      definition: {
        reader: (readerOption?.makeConfig ?? defaultSelector)(definition),
      },
      outputSchema,
    };
  });
}

export async function makeReaderFormState(
  extensionPoint: ExtensionPointConfig
): Promise<Array<ReaderFormState | ReaderReferenceFormState>> {
  const readerId = extensionPoint.definition.reader;

  let readerIds: RegistryId[];

  if (isPlainObject(readerId)) {
    throw new Error("Key-based composite readers not supported");
  } else if (typeof readerId === "string") {
    readerIds = [readerId];
  } else if (Array.isArray(readerId)) {
    readerIds = readerId as RegistryId[];
  } else {
    throw new TypeError("Unexpected reader configuration");
  }

  return Promise.all(
    readerIds.map(async (readerId) => {
      const brick = await findBrick(readerId);

      if (!brick) {
        try {
          const reader = await brickRegistry.lookup(readerId);
          return { metadata: selectMetadata(reader) };
        } catch (error: unknown) {
          console.error("Cannot find reader", { readerId, error });
          throw new Error("Cannot find reader");
        }
      }

      const reader = (brick.config as unknown) as ReaderConfig;
      return {
        metadata: reader.metadata,
        outputSchema: reader.outputSchema,
        definition: reader.definition.reader,
      };
    })
  );
}

/**
 * Availability with single matchPattern and selector.
 * The page editor UI currently doesn't support multiple patterns/selectors
 * @see Availability
 */
type SimpleAvailability = {
  matchPatterns: string | undefined;
  selectors: string | undefined;
};

/**
 * Map availability from extension point configuration to state for the page editor.
 * @throws Error if the isAvailable definition use features that aren't supported by the Page Editor
 */
export function selectIsAvailable(
  extensionPoint: ExtensionPointConfig
): SimpleAvailability {
  const { isAvailable } = extensionPoint.definition;
  const matchPatterns = castArray(isAvailable.matchPatterns ?? []);
  const selectors = castArray(isAvailable.selectors ?? []);

  if (matchPatterns.length > 1) {
    throw new Error(
      "Editing extension point with multiple availability match patterns not implemented"
    );
  }

  if (selectors.length > 1) {
    throw new Error(
      "Editing extension point with multiple availability selectors not implemented"
    );
  }

  return {
    matchPatterns: matchPatterns[0],
    selectors: selectors[0],
  };
}

export async function lookupExtensionPoint<
  TDefinition extends ExtensionPointDefinition,
  TConfig extends EmptyConfig,
  TType extends string
>(
  config: IExtension<TConfig>,
  type: TType
): Promise<
  ExtensionPointConfig<TDefinition> & { definition: { type: TType } }
> {
  if (!config) {
    throw new Error("config is required");
  }

  const brick = await findBrick(config.extensionPointId);
  if (!brick) {
    throw new Error(
      `Cannot find extension point definition: ${config.extensionPointId}`
    );
  }

  const extensionPoint = (brick.config as unknown) as ExtensionPointConfig<TDefinition>;
  if (extensionPoint.definition.type !== type) {
    throw new Error("Expected panel extension point type");
  }

  return extensionPoint as ExtensionPointConfig<TDefinition> & {
    definition: { type: TType };
  };
}

export function baseSelectExtensionPoint(
  formState: BaseFormState
): Except<ExtensionPointConfig, "definition"> {
  const { metadata } = formState.extensionPoint;

  return {
    apiVersion: "v1",
    kind: "extensionPoint",
    metadata: {
      id: metadata.id,
      // The server requires the version to save the brick, even though it's not marked as required
      // in the front-end schemas
      version: metadata.version ?? "1.0.0",
      name: metadata.name,
      // The server requires the description to save the brick, even though it's not marked as required
      // in the front-end schemas
      description: metadata.description ?? "Created using the Page Editor",
    },
  };
}
