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
import { type ValueOf } from "type-fest";

/**
 * A brick registry id conforming to `@scope/collection/name`
 */
export type RegistryId = string & {
  // Nominal subtyping
  _registryIdBrand: never;
};

/**
 * Scope for inner definitions
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
export type SemVerString = string & {
  _semVerBrand: never;
};

/**
 * Metadata about a Brick, StarterBrick, Integration, or Mod.
 */
export interface Metadata {
  /**
   * Registry id in the external registry
   */
  readonly id: RegistryId;

  /**
   * Human-readable name
   */
  readonly name: string;

  readonly description?: string;

  // Currently optional because it defaults to the browser extension version for bricks defined in JS
  readonly version?: SemVerString;

  /**
   * PixieBrix extension version required to install the brick/run the ModComponent
   * @since 1.4.0
   */
  // FIXME: this type is wrong. In practice, the value should be a semantic version range, e.g., >=1.4.0
  readonly extensionVersion?: SemVerString;
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
export interface Definition<K extends DefinitionKind = DefinitionKind> {
  apiVersion: ApiVersion;
  kind: K;
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
export type InnerDefinitionRef = string & {
  // Nominal subtyping
  _innerDefinitionRefBrand: never;
};

export interface RegistryItem<T extends RegistryId = RegistryId> {
  id: T;
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
