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
  INNER_SCOPE,
  type Metadata,
  DefinitionKinds,
  type RegistryId,
} from "@/types/registryTypes";
import { castArray, cloneDeep, isEmpty } from "lodash";
import {
  assertStarterBrickDefinitionLike,
  type StarterBrickDefinitionLike,
  type StarterBrickDefinitionProp,
} from "@/starterBricks/types";
import {
  type StarterBrickType,
  StarterBrickTypes,
} from "@/types/starterBrickTypes";
import type React from "react";
import { createSitePattern, SITES_PATTERN } from "@/permissions/patterns";
import { type Except } from "type-fest";
import {
  isInnerDefinitionRegistryId,
  uuidv4,
  validateRegistryId,
  normalizeSemVerString,
} from "@/types/helpers";
import { type BrickPipeline, type ReaderConfig } from "@/bricks/types";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { hasInnerStarterBrickRef } from "@/registry/hydrateInnerDefinitions";
import { normalizePipelineForEditor } from "./pipelineMapping";
import { emptyPermissionsFactory } from "@/permissions/permissionsUtils";
import { type ApiVersion } from "@/types/runtimeTypes";
import { type ModComponentBase } from "@/types/modComponentTypes";
import { type Schema } from "@/types/schemaTypes";
import { type SafeString, type UUID } from "@/types/stringTypes";
import { isExpression } from "@/utils/expressionUtils";
import { isNullOrBlank } from "@/utils/stringUtils";
import { deepPickBy, freeze } from "@/utils/objectUtils";
import { freshIdentifier } from "@/utils/variableUtils";
import {
  type BaseModComponentState,
  type BaseFormState,
  type SingleLayerReaderConfig,
} from "@/pageEditor/baseFormStateTypes";
import { emptyModOptionsDefinitionFactory } from "@/utils/modUtils";
import {
  type Availability,
  type NormalizedAvailability,
} from "@/types/availabilityTypes";
import { normalizeAvailability } from "@/bricks/available";
import { registry } from "@/background/messenger/api";

export interface WizardStep {
  step: string;
  Component: React.FunctionComponent<{
    eventKey: string;
  }>;
}

/**
 * Brick definition API controlling how the PixieBrix runtime interprets brick configurations
 * @see ApiVersion
 */
export const PAGE_EDITOR_DEFAULT_BRICK_API_VERSION: ApiVersion = "v3";

/**
 * Default definition entry for the inner definition of the starter brick for the mod component
 */
export const DEFAULT_STARTER_BRICK_VAR = "extensionPoint";

/**
 * Return availability for all sites.
 * @see getDefaultAvailabilityForUrl
 */
// XXX: technically we need deep freeze here because of the sub-array. Freezing top-level should catch most
//  accidental mutation, though
export const ALL_SITES_AVAILABILITY = freeze(
  normalizeAvailability({
    matchPatterns: [SITES_PATTERN],
  }),
);

/**
 * Returns default availability for the given URL.
 * @see ALL_SITES_AVAILABILITY
 */
export function getDefaultAvailabilityForUrl(
  url: string,
): NormalizedAvailability {
  return normalizeAvailability({
    matchPatterns: [createSitePattern(url)],
  });
}

/**
 * Return common mod component properties for the Page Editor form state
 */
export function baseFromModComponent<T extends StarterBrickType>(
  config: ModComponentBase,
  type: T,
): Pick<
  BaseFormState,
  | "uuid"
  | "apiVersion"
  | "installed"
  | "label"
  | "integrationDependencies"
  | "permissions"
  | "optionsArgs"
  | "modMetadata"
> & { type: T } {
  return {
    uuid: config.id,
    apiVersion: config.apiVersion,
    installed: true,
    label: config.label,
    // Normalize here because the fields aren't optional/nullable on the BaseFormState destination type.
    integrationDependencies: config.integrationDependencies ?? [],
    permissions: config.permissions ?? {},
    optionsArgs: config.optionsArgs ?? {},
    type,
    modMetadata: config._recipe,
  };
}

/**
 * Add the mod options to the form state if the mod component is a part of a mod
 */
export function initModOptionsIfNeeded<TFormState extends BaseFormState>(
  modComponentFormState: TFormState,
  modDefinitions: ModDefinition[],
) {
  if (modComponentFormState.modMetadata?.id) {
    const mod = modDefinitions?.find(
      (x) => x.metadata.id === modComponentFormState.modMetadata?.id,
    );

    if (mod?.options == null) {
      modComponentFormState.optionsDefinition =
        emptyModOptionsDefinitionFactory();
    } else {
      modComponentFormState.optionsDefinition = {
        schema: mod.options.schema.properties
          ? mod.options.schema
          : ({
              type: "object",
              properties: mod.options.schema,
            } as Schema),
        uiSchema: mod.options.uiSchema,
      };
    }
  }
}

export function baseSelectModComponent({
  apiVersion,
  uuid,
  label,
  optionsArgs,
  integrationDependencies,
  permissions,
  starterBrick,
  modMetadata: mod,
}: BaseFormState): Pick<
  ModComponentBase,
  | "id"
  | "apiVersion"
  | "extensionPointId"
  | "_recipe"
  | "label"
  | "integrationDependencies"
  | "permissions"
  | "optionsArgs"
> {
  return {
    id: uuid,
    apiVersion,
    extensionPointId: starterBrick.metadata.id,
    _recipe: mod,
    label,
    integrationDependencies,
    permissions,
    optionsArgs,
  };
}

export function makeInitialBaseState(
  uuid: UUID = uuidv4(),
): Except<BaseFormState, "type" | "label" | "starterBrick"> {
  return {
    uuid,
    apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
    integrationDependencies: [],
    permissions: emptyPermissionsFactory(),
    optionsArgs: {},
    modComponent: {
      blockPipeline: [],
    },
    modMetadata: undefined,
  };
}

/**
 * Create metadata for a temporary starter brick definition. When the starter brick is saved, it will be assigned
 * an id based on its hash, and included in the `definitions` section of the mod/mod component
 *
 * @see makeInternalId
 */
export function internalStarterBrickMetaFactory(): Metadata {
  return {
    id: validateRegistryId(`${INNER_SCOPE}/${uuidv4()}`),
    name: "Temporary starter brick",
  };
}

/**
 * Map availability from starter brick definition to state for the page editor.
 */
export function selectStarterBrickAvailability(
  starterBrickDefinition: StarterBrickDefinitionLike,
): NormalizedAvailability {
  assertStarterBrickDefinitionLike(starterBrickDefinition);
  return normalizeAvailability(starterBrickDefinition.definition.isAvailable);
}

/**
 * Exclude malformed rules from an isAvailable section that may have found their way over from the Page Editor.
 *
 * Currently, excludes:
 * - Null values
 * - Blank values
 *
 * The filtering logic is not part of normalizeAvailability because removing items can technically change the semantics
 * of the rule. E.g., a rule with an invalid URL pattern would match no sites, but an empty URL pattern array would
 * match all sites.
 *
 * @see normalizeAvailability
 */
export function cleanIsAvailable(
  availability: Availability,
): NormalizedAvailability {
  const { matchPatterns, urlPatterns, selectors, allFrames } =
    normalizeAvailability(availability);

  return {
    matchPatterns: matchPatterns.filter((x) => !isNullOrBlank(x)),
    urlPatterns: urlPatterns.filter((x) => isEmpty(x)),
    selectors: selectors.filter((x) => !isNullOrBlank(x)),
    allFrames,
  };
}

export async function lookupStarterBrick<
  TDefinition extends StarterBrickDefinitionProp,
  TConfig extends UnknownObject,
  TType extends string,
>(
  config: ModComponentBase<TConfig>,
  type: TType,
): Promise<
  StarterBrickDefinitionLike<TDefinition> & { definition: { type: TType } }
> {
  if (!config) {
    throw new Error("config is required");
  }

  if (hasInnerStarterBrickRef(config)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- checked by hasInnerStarterBrickRef
    const definition = config.definitions![config.extensionPointId];
    console.debug(
      "Converting mod component definition to temporary starter brick",
      definition,
    );
    const innerStarterBrick = {
      apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
      kind: DefinitionKinds.STARTER_BRICK,
      metadata: internalStarterBrickMetaFactory(),
      ...definition,
    } as unknown as StarterBrickDefinitionLike<TDefinition> & {
      definition: { type: TType };
    };

    assertStarterBrickDefinitionLike(innerStarterBrick);
    return innerStarterBrick;
  }

  const brick = await registry.find(config.extensionPointId);
  if (!brick) {
    throw new Error(
      `Cannot find starter brick definition: ${config.extensionPointId}`,
    );
  }

  const starterBrick =
    brick.config as unknown as StarterBrickDefinitionLike<TDefinition>;
  if (starterBrick.definition.type !== type) {
    throw new Error(`Expected ${type} starter brick type`);
  }

  return starterBrick as StarterBrickDefinitionLike<TDefinition> & {
    definition: { type: TType };
  };
}

export function baseSelectStarterBrick(
  formState: BaseFormState,
): Except<StarterBrickDefinitionLike, "definition"> {
  const { metadata } = formState.starterBrick;

  return {
    apiVersion: formState.apiVersion,
    kind: DefinitionKinds.STARTER_BRICK,
    metadata: {
      id: metadata.id,
      // The server requires the version to save the brick, even though it's not marked as required
      // in the front-end schemas
      version: metadata.version ?? normalizeSemVerString("1.0.0"),
      name: metadata.name,
      // The server requires the description to save the brick, even though it's not marked as required
      // in the front-end schemas
      description: metadata.description ?? "Created using the Page Editor",
    },
  };
}

export function modComponentWithInnerDefinitions(
  modComponent: ModComponentBase,
  starterBrickDefinition: StarterBrickDefinitionProp,
): ModComponentBase {
  if (isInnerDefinitionRegistryId(modComponent.extensionPointId)) {
    const starterBrick = freshIdentifier(
      DEFAULT_STARTER_BRICK_VAR as SafeString,
      Object.keys(modComponent.definitions ?? {}),
    );

    const result = cloneDeep(modComponent);
    result.definitions = {
      ...result.definitions,
      [starterBrick]: {
        kind: DefinitionKinds.STARTER_BRICK,
        definition: starterBrickDefinition,
      },
    };

    // XXX: we need to fix the type of ModComponentBase.extensionPointId to support variable names
    result.extensionPointId = starterBrick as RegistryId;

    return result;
  }

  return modComponent;
}

/**
 * Remove object entries undefined and empty-string values.
 *
 * - Formik/React need real blank values in order to control `input` tag components.
 * - PixieBrix does not want those because it treats an empty string as "", not null/undefined
 */
// eslint-disable-next-line @typescript-eslint/ban-types -- support interfaces that don't have index types
export function removeEmptyValues<T extends object>(obj: T): T {
  // Technically the return type is Partial<T> (with recursive partials). However, we'll trust that the PageEditor
  // requires the user to set values that actually need to be set. They'll also get caught by input validation
  // when the bricks are run.
  return deepPickBy(
    obj,
    (value: unknown, parent: unknown) =>
      isExpression(parent) || (value !== undefined && value !== ""),
  ) as T;
}

/**
 * Return a composite reader to automatically include in new mod components created with the Page Editor.
 */
export function getImplicitReader(
  type: StarterBrickType,
): SingleLayerReaderConfig {
  // Reminder: when providing a composite array reader, the later entries override the earlier ones

  const base = [
    validateRegistryId("@pixiebrix/document-metadata"),
    // Include @pixiebrix/document-context because it reads the current URL, instead of the original URL on the page.
    // Necessary to avoid confusion when working with SPAs
    validateRegistryId("@pixiebrix/document-context"),
  ] as ReaderConfig[];

  const elementAddons = [
    { element: validateRegistryId("@pixiebrix/html/element") },
  ] as const;

  if (type === "trigger") {
    return readerTypeHack([...base, ...elementAddons]);
  }

  if (type === "quickBar" || type === "quickBarProvider") {
    return readerTypeHack([
      ...base,
      ...elementAddons,
      validateRegistryId("@pixiebrix/selection"),
    ]);
  }

  if (type === "contextMenu") {
    // NOTE: we don't need to provide "@pixiebrix/context-menu-data" here because it's automatically attached by
    // the contextMenu starter brick.
    return readerTypeHack([...base, ...elementAddons]);
  }

  if (type === StarterBrickTypes.BUTTON) {
    return readerTypeHack([...base, ...elementAddons]);
  }

  return readerTypeHack(base);
}

/**
 * Hack to use SingleLayerReaderConfig to prevent TypeScript reporting problems with infinite type instantiation
 */
export function readerTypeHack(reader: ReaderConfig): SingleLayerReaderConfig {
  return reader as SingleLayerReaderConfig;
}

/**
 * Normalize the pipeline prop name and assign instance ids for tracing.
 * @param config the mod component configuration
 * @param pipelineProp the name of the pipeline prop, currently either "action" or "body"
 */
export async function modComponentWithNormalizedPipeline<
  T extends UnknownObject,
  Prop extends keyof T,
>(
  config: T,
  pipelineProp: Prop,
  defaults: Partial<T> = {},
): Promise<BaseModComponentState & Omit<T, Prop>> {
  const { [pipelineProp]: pipeline, ...rest } = { ...config };
  return {
    blockPipeline: await normalizePipelineForEditor(
      castArray(pipeline) as BrickPipeline,
    ),
    ...defaults,
    ...rest,
  };
}
