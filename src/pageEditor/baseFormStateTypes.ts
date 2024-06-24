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

import { type Except } from "type-fest";
import {
  type IntegrationDependency,
  type IntegrationDependencyV1,
  type IntegrationDependencyV2,
} from "@/integrations/integrationTypes";
import { type ApiVersion, type OptionsArgs } from "@/types/runtimeTypes";
import { type UUID } from "@/types/stringTypes";
import { type StarterBrickType } from "@/types/starterBrickTypes";
import { type Permissions } from "webextension-polyfill";
import { type ModComponentBase } from "@/types/modComponentTypes";
import { type ModOptionsDefinition } from "@/types/modDefinitionTypes";
import { type BrickPipeline } from "@/bricks/types";
import { type Metadata, type RegistryId } from "@/types/registryTypes";
import { type NormalizedAvailability } from "@/types/availabilityTypes";

/**
 * A simplified type for ReaderConfig to prevent TypeScript reporting problems with infinite type instantiation
 * @see ReaderConfig
 */
export type SingleLayerReaderConfig =
  | RegistryId
  | RegistryId[]
  | Record<string, RegistryId>;

export type BaseExtensionPointState = {
  metadata: Metadata;
  definition: {
    type: StarterBrickType;
    // We're currently not allowing users to modify readers in the page editor
    reader: SingleLayerReaderConfig;
    isAvailable: NormalizedAvailability;
  };
};

export interface BaseExtensionState {
  blockPipeline: BrickPipeline;
}

/**
 * @deprecated - Do not use versioned state types directly
 */
export interface BaseFormStateV1<
  TExtension extends BaseExtensionState = BaseExtensionState,
  TExtensionPoint extends BaseExtensionPointState = BaseExtensionPointState,
> {
  /**
   * The apiVersion of the brick definition, controlling how PixieBrix interprets brick definitions
   * @see ApiVersion
   */
  readonly apiVersion: ApiVersion;

  /**
   * The extension uuid
   */
  readonly uuid: UUID;

  /**
   * The type of the extensionPoint
   */
  readonly type: StarterBrickType;

  /**
   * True if the extensionPoint exists in the registry
   */
  installed?: boolean;

  /**
   * True if the extension should be allowed to auto-reload. In general, only extensions that require user
   * interaction to trigger should be allowed to auto-reload. Otherwise, PixieBrix might end up spamming an API
   */
  autoReload?: boolean;

  /**
   * User-provided name to identify the extension
   */
  label: string;

  /**
   * The input options from the extension's blueprint
   * @since 1.4.3
   */
  optionsArgs: OptionsArgs;

  services: IntegrationDependencyV1[];

  /**
   * The extra permissions required by the extension
   * @since 1.7.0
   */
  permissions: Permissions.Permissions;

  extensionPoint: TExtensionPoint;

  extension: TExtension;

  /**
   * Information about the recipe (i.e., blueprint) used to install the extension, or `undefined` if the extension
   * is not part of a recipe.
   * @see ModComponentBase._recipe
   */
  recipe: ModComponentBase["_recipe"] | undefined;

  /**
   * Information about the recipe (i.e., blueprint) options,
   * or `undefined` if the extension is not part of a recipe.
   * @see ModDefinition.options
   */
  optionsDefinition?: ModOptionsDefinition;
}

/**
 * @deprecated - Do not use versioned state types directly
 */
export type BaseFormStateV2<
  TExtension extends BaseExtensionState = BaseExtensionState,
  TExtensionPoint extends BaseExtensionPointState = BaseExtensionPointState,
> = Except<BaseFormStateV1<TExtension, TExtensionPoint>, "services"> & {
  /**
   * The integration dependencies configured for the extension
   *
   * @since 1.7.41 renamed from `services` to `integrationDependencies`, also
   * changed from IntegrationDependencyV1 to IntegrationDependencyV2
   */
  integrationDependencies: IntegrationDependencyV2[];
};

export type BaseFormState<
  TExtension extends BaseExtensionState = BaseExtensionState,
  TExtensionPoint extends BaseExtensionPointState = BaseExtensionPointState,
> = Except<
  BaseFormStateV2<TExtension, TExtensionPoint>,
  "integrationDependencies"
> & {
  /**
   * Using the un-versioned type
   */
  integrationDependencies: IntegrationDependency[];
};
