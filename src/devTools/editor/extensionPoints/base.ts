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
  Config,
  EmptyConfig,
  IExtension,
  Metadata,
  RegistryId,
  SafeString,
  selectMetadata,
  UUID,
} from "@/core";
import { castArray, cloneDeep, isPlainObject, omit } from "lodash";
import brickRegistry from "@/blocks/registry";
import { ReaderConfig, ReaderReference } from "@/blocks/readers/factory";
import {
  ExtensionPointConfig,
  ExtensionPointDefinition,
} from "@/extensionPoints/types";
import { find as findBrick } from "@/registry/localRegistry";
import React from "react";
import { createSitePattern } from "@/permissions/patterns";
import {
  BaseFormState,
  isCustomReader,
  ReaderFormState,
  ReaderReferenceFormState,
} from "@/devTools/editor/extensionPoints/elementConfig";
import { Except } from "type-fest";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { BlockPipeline } from "@/blocks/types";
import { freshIdentifier } from "@/utils";

export interface WizardStep {
  step: string;
  Component: React.FunctionComponent<{
    eventKey: string;
    editable?: Set<string>;
    available?: boolean;
  }>;
  extraProps?: Record<string, unknown>;
}

const INNER_SCOPE = "@internal";

export function isInnerExtensionPoint(id: RegistryId): boolean {
  return id.startsWith(INNER_SCOPE + "/");
}

export function makeIsAvailable(
  url: string
): { matchPatterns: string; selectors: string | null } {
  return {
    matchPatterns: createSitePattern(url),
    selectors: null,
  };
}

/**
 * Enrich a BlockPipeline with instanceIds for use in tracing.
 */
export function withInstanceIds(blocks: BlockPipeline): BlockPipeline {
  return blocks.map((blockConfig) => ({
    ...blockConfig,
    instanceId: uuidv4(),
  }));
}

/**
 * Remove the automatically generated tracing ids.
 */
export function excludeInstanceIds<T extends Config>(
  config: T,
  prop: keyof T
): T {
  return {
    ...config,
    // eslint-disable-next-line security/detect-object-injection -- prop checked in signature
    [prop]: (config[prop] as BlockPipeline).map((blockConfig) =>
      omit(blockConfig, "instanceId")
    ),
  };
}

export function makeBaseState(
  uuid: UUID = uuidv4()
): Except<BaseFormState, "type" | "label" | "extensionPoint"> {
  return {
    uuid,
    services: [],
    readers: [],
    extension: {},
  };
}

/**
 * Create metadata for a temporary extension point definition. When the extension point is saved, it will be moved
 * into the definitions section of the extension.
 */
export function internalExtensionPointMetaFactory(): Metadata {
  return {
    id: validateRegistryId(`${INNER_SCOPE}/${uuidv4()}`),
    name: "Temporary extension point",
  };
}

export function makeExtensionReaders({
  readers,
}: BaseFormState): Array<ReaderConfig | ReaderReference> {
  return readers.map((reader) => {
    if (!isCustomReader(reader)) {
      return { metadata: reader.metadata };
    }

    throw new Error("makeExtensionReaders does not support custom readers");
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

  if (hasInnerExtensionPoint(config)) {
    const definition = config.definitions[config.extensionPointId];
    console.debug(
      "Converting extension definition to temporary extension point",
      { definition }
    );
    return ({
      apiVersion: "v1",
      kind: "extensionPoint",
      metadata: internalExtensionPointMetaFactory(),
      definition,
    } as unknown) as ExtensionPointConfig<TDefinition> & {
      definition: { type: TType };
    };
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

const DEFAULT_EXTENSION_POINT_VAR = "extensionPoint";

export function extensionWithInnerDefinitions(
  extension: IExtension,
  extensionPointDefinition: ExtensionPointDefinition
): IExtension {
  if (isInnerExtensionPoint(extension.extensionPointId)) {
    const extensionPointId = freshIdentifier(
      DEFAULT_EXTENSION_POINT_VAR as SafeString,
      [...Object.keys(extension.definitions ?? {})]
    );

    const inner = cloneDeep(extension);
    inner.definitions = {
      ...inner.definitions,
      [extensionPointId]: {
        kind: "extensionPoint",
        definition: extensionPointDefinition,
      },
    };

    // XXX: we need to fix the type of IExtension.extensionPointId to support variable names
    inner.extensionPointId = extensionPointId as RegistryId;

    return inner;
  }

  return extension;
}
