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

/**
 * Type contract between the backend and front-end.
 */
import { RecipeDefinition } from "@/types/definitions";
import {
  ServiceConfig,
  SanitizedConfig,
  Metadata,
  UUID,
  Config,
  EmptyConfig,
  PersistedExtension,
} from "@/core";

import { components } from "@/types/swagger";
import { Except } from "type-fest";

export enum MemberRole {
  Member = 1,
  Admin = 2,
}

export type Kind = "block" | "foundation" | "service" | "blueprint" | "reader";

export type Invitation = components["schemas"]["Invitation"];

export type Organization = components["schemas"]["Organization"];

export type SanitizedAuth = components["schemas"]["SanitizedAuth"] & {
  // XXX: update serialize to required id in response type
  id: UUID;
  // Specialized to `SanitizedConfig` to get nominal typing
  config: SanitizedConfig;
  // XXX: update serializer to include proper metadata child serializer
  service: { config: { metadata: Metadata } };
};

export type ConfigurableAuth = components["schemas"]["EditableAuth"] & {
  // Specialized to `ServiceConfig` to get nominal typing
  config: ServiceConfig;
};

export type Deployment = components["schemas"]["DeploymentDetail"] & {
  id: UUID;
  package: { config: RecipeDefinition };
};

export type Brick = components["schemas"]["PackageMeta"] & {
  kind: Kind;
};

export type RegistryPackage = Pick<
  components["schemas"]["PackageConfigList"],
  "kind" | "metadata"
> & {
  // XXX: update serializer to include proper child serializer
  metadata: Metadata;
  kind: Kind;
};

/**
 * A personal user extension synced/saved to the cloud.
 */
export type CloudExtension<T extends Config = EmptyConfig> = Except<
  PersistedExtension<T>,
  "active"
> & {
  _remoteUserExtensionBrand: never;
  _deployment: undefined;
  _recipe: undefined;
};
