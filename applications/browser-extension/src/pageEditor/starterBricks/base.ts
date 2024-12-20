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
  INNER_SCOPE,
  type Metadata,
} from "@/types/registryTypes";
import { castArray, isEmpty } from "lodash";
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
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { type BrickPipeline, type ReaderConfig } from "@/bricks/types";
import { hasInnerStarterBrickRef } from "@/registry/hydrateInnerDefinitions";
import { normalizePipelineForEditor } from "./pipelineMapping";
import { emptyPermissionsFactory } from "@/permissions/permissionsUtils";
import { type ApiVersion } from "@/types/runtimeTypes";
import {
  type ModComponentBase,
  type ModMetadata,
} from "@/types/modComponentTypes";
import { type UUID } from "@/types/stringTypes";
import { isExpression } from "@/utils/expressionUtils";
import { isNullOrBlank } from "@/utils/stringUtils";
import { deepPickBy, freeze } from "@/utils/objectUtils";
import {
  type BaseFormState,
  type BaseModComponentState,
  type SingleLayerReaderConfig,
} from "@/pageEditor/store/editor/baseFormStateTypes";
import {
  type Availability,
  type NormalizedAvailability,
} from "@/types/availabilityTypes";
import { normalizeAvailability } from "@/bricks/available";
import { registry } from "@/background/messenger/api";

import { type DraftModState } from "@/pageEditor/store/editor/pageEditorTypes";
import { normalizeSemVerString } from "@/types/semVerHelpers";

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
    type,
    modMetadata: config.modMetadata,
  };
}

export function baseSelectModComponent(
  {
    apiVersion,
    uuid,
    label,
    integrationDependencies,
    permissions,
    starterBrick,
    modMetadata,
  }: BaseFormState,
  modState: DraftModState,
): Pick<
  ModComponentBase,
  | "id"
  | "apiVersion"
  | "extensionPointId"
  | "modMetadata"
  | "label"
  | "integrationDependencies"
  | "permissions"
  | "variablesDefinition"
  | "optionsArgs"
> {
  return {
    id: uuid,
    apiVersion,
    extensionPointId: starterBrick.metadata.id,
    modMetadata,
    label,
    integrationDependencies,
    permissions,
    optionsArgs: modState.optionsArgs,
    variablesDefinition: modState.variablesDefinition,
  };
}

export function makeInitialBaseState({
  modMetadata,
  modComponentId = uuidv4(),
}: {
  modComponentId?: UUID;
  modMetadata: ModMetadata;
}): Except<BaseFormState, "label" | "starterBrick"> {
  return {
    uuid: modComponentId,
    apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
    modMetadata,
    integrationDependencies: [],
    permissions: emptyPermissionsFactory(),
    modComponent: {
      brickPipeline: [],
    },
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
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked by hasInnerStarterBrickRef
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
      // TODO: https://github.com/pixiebrix/pixiebrix-extension/issues/9265 -- mark version as required
      version: metadata.version ?? normalizeSemVerString("1.0.0"),
      name: metadata.name,
      // The server requires the description to save the brick, even though it's not marked as required
      // in the front-end schemas
      description: metadata.description ?? "Created using the Page Editor",
    },
  };
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

  if (type === StarterBrickTypes.TRIGGER) {
    return readerTypeHack([...base, ...elementAddons]);
  }

  if (
    [
      StarterBrickTypes.QUICK_BAR_ACTION,
      StarterBrickTypes.DYNAMIC_QUICK_BAR,
    ].includes(type)
  ) {
    return readerTypeHack([
      ...base,
      ...elementAddons,
      validateRegistryId("@pixiebrix/selection"),
    ]);
  }

  if (type === StarterBrickTypes.CONTEXT_MENU) {
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
    brickPipeline: await normalizePipelineForEditor(
      castArray(pipeline) as BrickPipeline,
    ),
    ...defaults,
    ...rest,
  };
}
