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

import { type Permissions } from "webextension-polyfill";
import { type Except } from "type-fest";
import {
  type InnerDefinitionRef,
  type InnerDefinitions,
  type Metadata,
  type RegistryId,
  type Sharing,
} from "@/types/registryTypes";
import { type Timestamp, type UUID } from "@/types/stringTypes";
import {
  type ApiVersion,
  type OptionsArgs,
  type TemplateEngine,
} from "@/types/runtimeTypes";
import {
  type IntegrationDependencyV1,
  type IntegrationDependencyV2,
} from "@/integrations/integrationTypes";
import { isRegistryId, isUUID } from "@/types/helpers";
import { type DeploymentMetadata } from "@/types/deploymentTypes";
import { type ModVariablesDefinition } from "@/types/modDefinitionTypes";

/**
 * ModMetadata that includes sharing information.
 *
 * We created this type as an alternative to Metadata in order to include information about the origin of a ModComponent,
 * e.g. on the mods screen.
 *
 * @see optionsSlice
 * @see ModComponentBase.modMetadata
 * @see Metadata
 */
// XXX: previously we didn't export because the usage was clearer as ModComponentBase[_recipe]. However, the ergonomics
// of (ModMetadata | undefined) were bad to handle with strict null checks
export type ModMetadata = Metadata & {
  /**
   * `undefined` for mods that were activated prior to the field being added
   */
  sharing: Sharing | null;

  /**
   * `undefined` for mods that were activated prior to the field being added
   * @since 1.4.8
   */
  updated_at: Timestamp | null;
};

/**
 * @deprecated - Do not use versioned state types directly
 */
export type ModComponentBaseV1<Config extends UnknownObject = UnknownObject> = {
  /**
   * UUID of the ModComponent.
   */
  id: UUID;

  /**
   * The PixieBrix brick definition API version, controlling how the runtime interprets configuration values.
   * @see ApiVersion
   */
  apiVersion: ApiVersion;

  /**
   * Registry id of the StarterBrick, or a reference to the definitions section.
   */
  extensionPointId: RegistryId | InnerDefinitionRef;

  /**
   * Metadata about the deployment used to activate the ModComponent, or `undefined` if the ModComponent was not
   * installed via a deployment.
   */
  _deployment?: DeploymentMetadata;

  /**
   * Metadata about the mod used to install the ModComponent, or `undefined` if the user created this ModComponent
   * directly
   *
   * (Previously mods were named "recipes")
   */
  _recipe: ModMetadata | undefined;

  /**
   * A human-readable label for the ModComponent.
   */
  label: string;

  /**
   * Default template engine when running the ModComponent.
   * @deprecated not used in v3 of the runtime
   */
  templateEngine?: TemplateEngine;

  /**
   * Additional permissions, e.g., origins to perform effects on after opening a tab.
   */
  permissions?: Permissions.Permissions;

  /**
   * Inner/anonymous definitions used by the ModComponent.
   *
   * Supported definitions:
   * - StarterBricks
   * - components
   * - readers
   *
   * @see HydratedModComponent
   */
  definitions?: InnerDefinitions;

  /**
   * Configured services/integrations for the ModComponent.
   */
  services?: IntegrationDependencyV1[];

  /**
   * Options the end-user or deployment admin/manager has configured.
   */
  optionsArgs?: OptionsArgs;

  /**
   * The ModComponent configuration for the StarterBrick.
   */
  config: Config;

  /**
   * True if the ModComponent is activated in the client
   *
   * For ModComponents on the server, but not activated on the client, this will be false.
   */
  active?: boolean;
};

/**
 * @deprecated - Do not use versioned state types directly
 */
export type ModComponentBaseV2<Config extends UnknownObject = UnknownObject> =
  Except<ModComponentBaseV1<Config>, "services"> & {
    /**
     * Configured integration dependencies for the ModComponent.
     *
     * @since 1.7.41 renamed from `services` to `integrationDependencies`
     */
    integrationDependencies?: IntegrationDependencyV2[];
  };

/**
 * @deprecated - Do not use versioned state types directly
 */
export type ModComponentBaseV3<Config extends UnknownObject = UnknownObject> =
  ModComponentBaseV2<Config> & {
    /**
     * Mod variables declared in the mod definition.
     *
     * Like optionsArgs, must be replicated on each mod component within the mod because activated mod components
     * are persisted without the mod definition.
     *
     * @since 2.1.2
     */
    variablesDefinition?: ModVariablesDefinition;
  };

/**
 * @deprecated - Do not use versioned state types directly
 */
export type ModComponentBaseV4<Config extends UnknownObject = UnknownObject> =
  Except<ModComponentBaseV3<Config>, "_recipe" | "_deployment"> & {
    /**
     * Metadata about the mod used to activate the ModComponent.
     * @since 2.1.5
     */
    modMetadata: ModMetadata;

    /**
     * Metadata about the deployment used to activate the ModComponent, or `undefined` if the ModComponent was not
     * installed via a deployment.
     */
    deploymentMetadata?: DeploymentMetadata | undefined;
  };

// XXX: technically Config could be JsonObject, but that's annoying to work with at callsites.
export type ModComponentBase<Config extends UnknownObject = UnknownObject> =
  ModComponentBaseV4<Config>;

export type SerializedModComponentV1<
  Config extends UnknownObject = UnknownObject,
> = ModComponentBaseV1<Config> & {
  _serializedModComponentBrand: never;
};

export type SerializedModComponentV2<
  Config extends UnknownObject = UnknownObject,
> = ModComponentBaseV2<Config> & {
  _serializedModComponentBrand: never;
};

export type SerializedModComponentV3<
  Config extends UnknownObject = UnknownObject,
> = ModComponentBaseV3<Config> & {
  _serializedModComponentBrand: never;
};

export type SerializedModComponentV4<
  Config extends UnknownObject = UnknownObject,
> = ModComponentBaseV4<Config> & {
  _serializedModComponentBrand: never;
};

/**
 * An ModComponentBase that is known not to have had its inner definitions hydrated.
 *
 * NOTE: it might be the case that the ModComponent does not have a definitions section/inner definitions. This nominal
 * type is just tracking whether we've passed the instance through hydration yet.
 *
 * @see ModComponentBase
 * @see HydratedModComponent
 */
export type SerializedModComponent<
  Config extends UnknownObject = UnknownObject,
> = ModComponentBase<Config> & {
  _serializedModComponentBrand: never;
};

type ActivatedModComponentBase = {
  /**
   * True to indicate this ModComponent has been activated on the client.
   */
  active: true;

  /**
   * Creation timestamp in ISO format with timezone.
   *
   * Currently, not used for anything - might be used for sorting, etc. in the future.
   */
  createTimestamp: Timestamp;

  /**
   * Update timestamp in ISO format with timezone.
   *
   * Used to determine if local version is outdated compared to user's version on the server.
   */
  updateTimestamp: Timestamp;
};

export type ActivatedModComponentV1<
  Config extends UnknownObject = UnknownObject,
> = SerializedModComponentV1<Config> & ActivatedModComponentBase;

export type ActivatedModComponentV2<
  Config extends UnknownObject = UnknownObject,
> = SerializedModComponentV2<Config> & ActivatedModComponentBase;

export type ActivatedModComponentV3<
  Config extends UnknownObject = UnknownObject,
> = SerializedModComponentV3<Config> & ActivatedModComponentBase;

export type ActivatedModComponentV4<
  Config extends UnknownObject = UnknownObject,
> = SerializedModComponentV4<Config> & ActivatedModComponentBase;

/**
 * A ModComponent that has been activated locally
 * @see ModComponentBase
 * @see UserExtension
 */
export type ActivatedModComponent<
  Config extends UnknownObject = UnknownObject,
> = ActivatedModComponentV4<Config>;

/**
 * An `ModComponentBase` with all inner brick definitions hydrated.
 * @see SerializedModComponent
 * @see hydrateModComponentInnerDefinitions
 */
export type HydratedModComponent<Config extends UnknownObject = UnknownObject> =
  Except<
    ModComponentBase<Config>,
    // There's no definition section after hydration.
    "definitions"
  > & {
    /**
     * The registry id of the StarterBrick. Is an `@internal` scope, if the StarterBrick was defined using an
     * internal definition.
     */
    extensionPointId: RegistryId;

    /**
     * Brand for nominal typing.
     */
    // XXX: defining our own brand vs. using type-fest's tagged type because we need to be able to apply the brand
    // in cooky-cutter factory definitions
    _hydratedModComponentBrand: never;
  };

/**
 * A reference to a ModComponentBase, including the associated mod and starter brick. Prefer using the mod component's
 * UUID directly if information about the mod and/or starter brick are not required.
 * @see ModComponentBase
 */
export type ModComponentRef = {
  /**
   * UUID of the ModComponent.
   */
  modComponentId: UUID;

  /**
   * Mod the ModComponent is from.
   * @see INNER_SCOPE
   */
  modId: RegistryId;

  /**
   * Registry id of the mod component's StarterBrick.
   */
  starterBrickId: RegistryId;
};

/**
 * Returns true if the value is a syntactically valid non-null ModComponentRef. Does not validate the existence of the
 * mod component, mod, or starter brick.
 * @see validateModComponentRef
 */
function isModComponentRef(value: unknown): value is ModComponentRef {
  if (typeof value !== "object" || value == null) {
    return false;
  }

  const obj = value as ModComponentRef;

  return (
    isUUID(obj.modComponentId) &&
    isRegistryId(obj.modId) &&
    isRegistryId(obj.starterBrickId)
  );
}

/**
 * Validates and returns a ModComponentRef. Does not validate the existence of the mod component, mod, or starter brick.
 * @throws TypeError if the value is not a valid ModComponentRef
 * @see isModComponentRef
 */
export function validateModComponentRef(value: unknown): ModComponentRef {
  if (!isModComponentRef(value)) {
    throw new TypeError("Invalid ModComponentRef");
  }

  return value;
}
