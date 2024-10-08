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
import {
  type ModComponentBase,
  type ModMetadata,
} from "@/types/modComponentTypes";
import {
  type ModOptionsDefinition,
  type ModVariablesDefinition,
} from "@/types/modDefinitionTypes";
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

export type BaseStarterBrickState = {
  metadata: Metadata;
  definition: {
    type: StarterBrickType;
    // We're currently not allowing users to modify readers in the page editor
    reader: SingleLayerReaderConfig;
    isAvailable: NormalizedAvailability;
  };
};

/**
 * @deprecated - Do not use versioned state types directly
 */
export type BaseModComponentStateV1 = {
  blockPipeline: BrickPipeline;
};

/**
 * @deprecated - Do not use versioned state types directly
 */
export type BaseModComponentStateV2 = Except<
  BaseModComponentStateV1,
  "blockPipeline"
> & {
  brickPipeline: BrickPipeline;
};

export type BaseModComponentState = BaseModComponentStateV2;

/**
 * @deprecated - Do not use versioned state types directly
 * @see BaseFormState
 */
export interface BaseFormStateV1<
  TModComponent extends BaseModComponentStateV1 = BaseModComponentStateV1,
  TStarterBrick extends BaseStarterBrickState = BaseStarterBrickState,
> {
  /**
   * The apiVersion of the brick definition, controlling how PixieBrix interprets brick definitions
   * @see ApiVersion
   */
  readonly apiVersion: ApiVersion;

  /**
   * The mod component uuid
   */
  readonly uuid: UUID;

  /**
   * The type of the starter brick
   */
  readonly type: StarterBrickType;

  /**
   * True if the starter brick exists in the registry
   */
  installed?: boolean;

  /**
   * True if the mod component should be allowed to auto-reload. In general, only mod components that require user
   * interaction to trigger should be allowed to auto-reload. Otherwise, PixieBrix might end up spamming an API
   */
  autoReload?: boolean;

  /**
   * User-provided name to identify the mod component
   */
  label: string;

  /**
   * The input options from the mod component's mod
   * @since 1.4.3
   */
  optionsArgs: OptionsArgs;

  services: IntegrationDependencyV1[];

  /**
   * The extra permissions required by the mod component
   * @since 1.7.0
   */
  permissions: Permissions.Permissions;

  extensionPoint: TStarterBrick;

  extension: TModComponent;

  /**
   * Information about the mod used to activate the mod component, or `undefined`
   * if the mod component is not part of a mod.
   * @see ModComponentBase._recipe
   */
  recipe: ModComponentBase["_recipe"] | undefined;

  /**
   * Information about the mod options or `undefined`
   * if the mod component is not part of a mod.
   * @see ModDefinition.options
   */
  optionsDefinition?: ModOptionsDefinition;
}

/**
 * @deprecated - Do not use versioned state types directly
 * @see BaseFormState
 */
export type BaseFormStateV2<
  TModComponent extends BaseModComponentStateV1 = BaseModComponentStateV1,
  TStarterBrick extends BaseStarterBrickState = BaseStarterBrickState,
> = Except<BaseFormStateV1<TModComponent, TStarterBrick>, "services"> & {
  /**
   * The integration dependencies configured for the mod component
   *
   * @since 1.7.41 renamed from `services` to `integrationDependencies`, also
   * changed from IntegrationDependencyV1 to IntegrationDependencyV2
   */
  integrationDependencies: IntegrationDependencyV2[];
};

/**
 * @deprecated - Do not use versioned state types directly
 * @see BaseFormState
 */
export type BaseFormStateV3<
  TModComponent extends BaseModComponentStateV2 = BaseModComponentStateV2,
  TStarterBrick extends BaseStarterBrickState = BaseStarterBrickState,
> = Except<
  BaseFormStateV2<BaseModComponentStateV1, TStarterBrick>,
  "recipe" | "extension" | "extensionPoint"
> & {
  /**
   * @since 2.0.5
   * Part of the Page Editor renaming effort
   * `extensionPoint` to `starterBrick`
   */
  starterBrick: TStarterBrick;

  /**
   * @since 2.0.5
   * Part of the Page Editor renaming effort
   * `extension` to `modComponent`
   */
  modComponent: TModComponent;

  /**
   * @since 2.0.5
   * Part of the Page Editor renaming effort
   * `recipe` to `modMetadata`
   * Information about the mod used to activate the mod component, or `undefined`
   * if the mod component is not part of a mod.
   * @see ModComponentBase._recipe
   */
  modMetadata: ModComponentBase["_recipe"] | undefined;
};

/**
 * @deprecated - Do not use versioned state types directly
 * @see BaseFormState
 */
export type BaseFormStateV4<
  TModComponent extends BaseModComponentStateV2 = BaseModComponentStateV2,
  TStarterBrick extends BaseStarterBrickState = BaseStarterBrickState,
> = Except<
  BaseFormStateV3<TModComponent, TStarterBrick>,
  /**
   * @since 2.0.6
   * The starter brick type is available on the `starterBrick` property, this is not needed
   */
  "type"
>;

/**
 * Base form state version that introduces a variablesDefinition section for declaring mod variables.
 * @deprecated - Do not use versioned state types directly
 * @see BaseFormState
 * @since 2.1.2
 */
export type BaseFormStateV5<
  TModComponent extends BaseModComponentState = BaseModComponentState,
  TStarterBrick extends BaseStarterBrickState = BaseStarterBrickState,
> = BaseFormStateV4<TModComponent, TStarterBrick> & {
  /**
   * The mod variable definitions/declarations
   * @see ModDefinition.variables
   * @since 2.1.2
   */
  variablesDefinition: ModVariablesDefinition;
};

/**
 * Base form state version that eliminates standalone mod components by containing in an unsaved mod
 * @deprecated - Do not use versioned state types directly
 * @see BaseFormState
 * @since 2.1.4
 */
export type BaseFormStateV6<
  TModComponent extends BaseModComponentState = BaseModComponentState,
  TStarterBrick extends BaseStarterBrickState = BaseStarterBrickState,
> =
  // Can't use SetRequired because the property is required (it does not use ?), but it can be set to undefined
  Except<BaseFormStateV5<TModComponent, TStarterBrick>, "modMetadata"> & {
    /**
     * The mod metadata for the mod component
     * @see createNewUnsavedModMetadata
     */
    modMetadata: ModMetadata;
  };

export type BaseFormState<
  TModComponent extends BaseModComponentState = BaseModComponentState,
  TStarterBrick extends BaseStarterBrickState = BaseStarterBrickState,
> = Except<
  // On migration, re-point this type to the most recent BaseFormStateV<N> type name
  BaseFormStateV6<TModComponent, TStarterBrick>,
  // NOTE: overriding integrationDependencies is not changing the type shape/structure. It's just cleaning up the
  // type name/reference which makes types easier to work with for testing migrations.
  "integrationDependencies"
> & {
  integrationDependencies: IntegrationDependency[];
};
