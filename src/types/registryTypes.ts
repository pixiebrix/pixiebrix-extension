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

import { type UUID } from "@/types/stringTypes";
import { type ApiVersion } from "@/types/runtimeTypes";
import { type SetRequired, type Tagged, type ValueOf } from "type-fest";
import { type Schema } from "@/types/schemaTypes";
import { type FeatureFlag } from "@/auth/featureFlags";

/**
 * A brick registry id conforming to `@scope/collection/name`
 */
export type RegistryId = Tagged<string, "RegistryId">;

/**
 * Scope for inner definitions
 * @see isInternalRegistryId
 */
export const INNER_SCOPE = "@internal";

/**
 * Constants for the different kinds of top-level definitions in the registry.
 *
 * See https://github.com/pixiebrix/pixiebrix-extension/tree/main/schemas
 */
export const DefinitionKinds = {
  STARTER_BRICK: "extensionPoint",
  MOD: "recipe",
  INTEGRATION: "service",
  BRICK: "component",
  READER: "reader",
} as const;

/**
 * The kind of definition in the external package registry.
 */
export type DefinitionKind = ValueOf<typeof DefinitionKinds>;

/**
 * Simple semantic version number, major.minor.patch
 */
export type SemVerString = Tagged<string, "SemVer">;

/**
 * Registry item metadata definition shape.
 *
 * Use PackageInstance instead if expecting a package instance, e.g., `Brick`, `StarterBrick`, `Integration`.
 *
 * @see Definition.metadata
 * @see PackageInstance
 */
export type Metadata = {
  /**
   * Registry id in the external package registry.
   */
  readonly id: RegistryId;

  /**
   * Human-readable name.
   */
  readonly name: string;

  /**
   * An optional human-readable description.
   */
  readonly description?: string;

  /**
   * The semantic version of the package.
   *
   * Currently optional because it defaults to the browser extension version for bricks defined in JS.
   */
  // TODO: https://github.com/pixiebrix/pixiebrix-extension/issues/9265 -- require version for all metadata
  readonly version?: SemVerString;

  /**
   * PixieBrix extension version required to install the brick/run the ModComponent
   * @since 1.4.0
   */
  // FIXME: this type is wrong. In practice, the value should be a semantic version range, e.g., >=1.4.0
  readonly extensionVersion?: SemVerString;
};

/**
 * Registry item metadata definition shape with required version.
 *
 * Introduced in 2.1.5 to strengthen the type of `Metadata.version` for ModDefinitions.
 *
 * Use PackageInstance instead if expecting a package instance, e.g., `Brick`, `StarterBrick`, `Integration`.
 *
 * @see ModDefinition.metadata
 * @see Metadata
 * @see PackageInstance
 * @since 2.1.5
 */
// TODO: https://github.com/pixiebrix/pixiebrix-extension/issues/9265 -- require version for all metadata
export type VersionedMetadata = SetRequired<Metadata, "version">;

/**
 * Interface for registry package instances, i.e., `Brick`, `StarterBrick`, and `Integration`.
 *
 * NOTE: mod definitions exist in the registry, but are not instantiated as a package instance object.
 *
 * Introduced in 2.0.5 to disambiguate usage with definition `Metadata`.
 *
 * @since 2.0.5
 * @see Metadata
 */
export interface PackageInstance extends Metadata {
  // Type currently matches Metadata, given that instances used to extend directly from Metadata
  inputSchema?: Schema;
  outputSchema?: Schema;
  schema?: Schema;

  /**
   * (Optional) if provided, the feature flag required to view/use the package
   * @since 2.0.7
   */
  featureFlag?: FeatureFlag;
}

/**
 * NOTE: the sharing definition is not part of the definition the user writes. But the backend adds it before sending
 * the definition to the frontend.
 */
export type Sharing = {
  /**
   * True if the registry package is public
   */
  readonly public: boolean;
  /**
   * The UUIDs of the organizations that have access to the package. (And are visible to the user.)
   */
  readonly organizations: UUID[];
};

/**
 * A definition in the PixieBrix registry
 */
export interface Definition<Kind extends DefinitionKind = DefinitionKind> {
  apiVersion: ApiVersion;
  kind: Kind;
  metadata: Metadata;
}

/**
 * The inner definitions section of a definition.
 */
export type InnerDefinitions = Record<string, UnknownObject>;

/**
 * A reference to an entry in the mod's `definitions` map. _Not a valid RegistryId_.
 * @see InnerDefinitions
 */
export type InnerDefinitionRef = Tagged<string, "InnerDefinitionRef">;

/**
 * A registry item with an id.
 */
export interface RegistryItem<Id extends RegistryId = RegistryId> {
  id: Id;
}

/**
 * Error thrown when a registry item does not exist.
 */
export class DoesNotExistError extends Error {
  override name = "DoesNotExistError";

  constructor(public readonly id: string) {
    super(`Registry item does not exist: ${id}`);
  }
}

/**
 * A registry that can look up items by id.
 * @since 1.8.2
 */
export interface RegistryProtocol<
  Id extends RegistryId = RegistryId,
  Item extends RegistryItem<Id> = RegistryItem<Id>,
> {
  lookup: (id: Id) => Promise<Item>;
}

/**
 * A registry that can enumerate all items accessible to the user.
 */
export interface EnumerableRegistryProtocol<
  Id extends RegistryId = RegistryId,
  Item extends RegistryItem<Id> = RegistryItem<Id>,
> extends RegistryProtocol<Id, Item> {
  all: () => Promise<Item[]>;
}
