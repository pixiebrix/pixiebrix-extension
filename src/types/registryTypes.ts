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

import { type BlockIcon } from "@/types/iconTypes";
import { type UUID } from "@/types/stringTypes";
import { type ApiVersion } from "@/types/runtimeTypes";

/**
 * A brick registry id conforming to `@scope/collection/name`
 */
export type RegistryId = string & {
  // Nominal subtyping
  _registryIdBrand: never;
};

// TODO: rationalize these types
export type Kind = "recipe" | "service" | "reader" | "component";
export type RawConfigKind =
  | "service"
  | "extensionPoint"
  | "component"
  | "reader"
  | "recipe";

/**
 * Simple semantic version number, major.minor.patch
 */
export type SemVerString = string & {
  _semVerBrand: never;
};

/**
 * Metadata about a block, extension point, or service
 */
export interface Metadata {
  readonly id: RegistryId;
  readonly name: string;
  // XXX: why is this optional? Should default to the version of the extension?
  readonly version?: SemVerString;
  readonly description?: string;

  /**
   * @deprecated experimental prop that will likely be removed in the future
   */
  readonly icon?: BlockIcon;

  /**
   * @deprecated experimental prop that will likely be removed in the future
   */
  readonly author?: string;

  /**
   * PixieBrix extension version required to install the brick/run the extension
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
  readonly public: boolean;
  readonly organizations: UUID[];
};

/**
 * A PixieBrix registry entity
 */
export interface Definition<K extends RawConfigKind = RawConfigKind> {
  apiVersion: ApiVersion;
  kind: K;
  metadata: Metadata;
}

/**
 * A reference to an entry if the recipe's `definitions` map
 */
export type InnerDefinitionRef = string & {
  // Nominal subtyping
  _innerDefinitionRefBrand: never;
};

/**
 * A reference to a package in the registry that the user has edit permissions for.
 */
export type EditablePackage = {
  /**
   * The surrogate key of the package on the backend.
   */
  id: UUID;

  /**
   * The registry id of the package
   */
  name: RegistryId;

  // Nominal typing to help distinguish from registry Metadata
  _editablePackageBrand: never;
};
