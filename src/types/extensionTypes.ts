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

import { type Permissions } from "webextension-polyfill";
import { type Except } from "type-fest";
import {
  type InnerDefinitionRef,
  type InnerDefinitions,
  type RegistryId,
  type Sharing,
  type Metadata,
} from "@/types/registryTypes";
import { type Timestamp, type UUID } from "@/types/stringTypes";
import {
  type ApiVersion,
  type TemplateEngine,
  type UserOptions,
} from "@/types/runtimeTypes";
import { type UnknownObject } from "@/types/objectTypes";
import { type ServiceDependency } from "@/types/serviceTypes";

/**
 * RecipeMetadata that includes sharing information.
 *
 * We created this type as an alternative to Metadata in order to include information about the origin of an extension,
 * e.g. on the ActiveBricks page.
 *
 * @see optionsSlice
 * @see IExtension._recipe
 */
// Don't export -- the use is clearer if it's always written as IExtension[_recipe] property
type RecipeMetadata = Metadata & {
  /**
   * `undefined` for recipes that were activated prior to the field being added
   */
  sharing: Sharing | null;

  /**
   * `undefined` for recipes that were activated prior to the field being added
   * @since 1.4.8
   */
  updated_at: Timestamp | null;
};

/**
 * Context about an automatically activated organization Deployment.
 */
// Don't export -- context is clearer if it's always written as IExtension[_deployment] property
type DeploymentMetadata = {
  /**
   * Unique id of the deployment
   */
  id: UUID;

  /**
   * `updated_at` timestamp of the deployment object from the server (in ISO format). Used to determine whether the
   * client has latest deployment settings installed.
   */
  timestamp: string;

  /**
   * True iff the deployment is temporarily disabled.
   *
   * If undefined, is considered active for backward compatability
   *
   * @since 1.4.0
   */
  active?: boolean;
};

// XXX: technically Config could be JsonObject, but that's annoying to work with at callsites.
export type IExtension<Config extends UnknownObject = UnknownObject> = {
  /**
   * UUID of the extension.
   */
  id: UUID;

  /**
   * The PixieBrix brick definition API version, controlling how the runtime interprets configuration values.
   * @see ApiVersion
   */
  apiVersion: ApiVersion;

  /**
   * Registry id of the extension point, or a reference to the definitions section.
   */
  extensionPointId: RegistryId | InnerDefinitionRef;

  /**
   * Metadata about the deployment used to install the extension, or `undefined` if the extension was not installed
   * via a deployment.
   */
  _deployment?: DeploymentMetadata;

  /**
   * Metadata about the recipe used to install the extension, or `undefined` if the user created this extension
   * directly
   */
  _recipe: RecipeMetadata | undefined;

  /**
   * A human-readable label for the extension.
   */
  label: string | null;

  /**
   * Default template engine when running the extension.
   * @deprecated not used in v3 of the runtime
   */
  templateEngine?: TemplateEngine;

  /**
   * Additional permissions, e.g., origins to perform effects on after opening a tab.
   */
  permissions?: Permissions.Permissions;

  /**
   * Inner/anonymous definitions used by the extension.
   *
   * Supported definitions:
   * - extension points
   * - components
   * - readers
   *
   * @see ResolvedExtension
   */
  definitions?: InnerDefinitions;

  /**
   * Configured services/integrations for the extension.
   */
  services?: ServiceDependency[];

  /**
   * Options the end-user has configured (i.e., during blueprint activation)
   */
  optionsArgs?: UserOptions;

  /**
   * The extension configuration for the extension point.
   */
  config: Config;

  /**
   * True iff the extension is activated in the client
   *
   * For extensions on the server, but not activated on the client, this will be false.
   */
  active?: boolean;
};

/**
 * An IExtension that is known not to have had its definitions resolved.
 *
 * NOTE: it might be the case that the extension does not have a definitions section/inner definitions. This nominal
 * type is just tracking whether we've passed the instance through resolution yet.
 *
 * @see IExtension
 * @see ResolvedExtension
 */
export type UnresolvedExtension<Config extends UnknownObject = UnknownObject> =
  IExtension<Config> & {
    _unresolvedExtensionBrand: never;
  };

/**
 * An extension that has been saved locally
 * @see IExtension
 * @see UserExtension
 */
export type PersistedExtension<Config extends UnknownObject = UnknownObject> =
  UnresolvedExtension<Config> & {
    /**
     * True to indicate this extension has been activated on the client.
     */
    active: true;

    /**
     * Creation timestamp in ISO format with timezone.
     *
     * Currently, not used for anything - might be used for sorting, etc. in the future.
     */
    createTimestamp: string;

    /**
     * Update timestamp in ISO format with timezone.
     *
     * Used to determine if local version is outdated compared to user's version on the server.
     */
    updateTimestamp: string;
  };

/**
 * An `IExtension` with all inner definitions resolved.
 * @see resolveDefinitions
 */
export type ResolvedExtension<Config extends UnknownObject = UnknownObject> =
  Except<
    IExtension<Config>,
    // There's no definition section after resolution
    "definitions"
  > & {
    /**
     * The registry id of the extension point (will be an `@internal` scope, if the extension point was originally defined
     * internally.
     */
    extensionPointId: RegistryId;

    /**
     * Brand for nominal typing.
     */
    _resolvedExtensionBrand: never;
  };

/**
 * A reference to an IExtension.
 */
export type ExtensionRef = {
  /**
   * UUID of the extension.
   */
  extensionId: UUID;

  /**
   * Registry id of the extension point.
   */
  extensionPointId: RegistryId;

  /**
   * Blueprint the extension is from.
   */
  blueprintId: RegistryId | null;
};
