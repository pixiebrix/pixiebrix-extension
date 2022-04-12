/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import {
  RecipeDefinition,
  SharingDefinition,
  UnsavedRecipeDefinition,
} from "@/types/definitions";
import {
  SanitizedConfig,
  Metadata,
  UUID,
  Config,
  EmptyConfig,
  PersistedExtension,
  Timestamp,
} from "@/core";

import { components } from "@/types/swagger";
import { Except } from "type-fest";
import { FortAwesomeLibrary } from "@/components/AsyncIcon";
import { AxiosResponse } from "axios";

export type Kind = "block" | "foundation" | "service" | "blueprint" | "reader";

export type Invitation = components["schemas"]["Invitation"];

type MeGroup = components["schemas"]["Me"]["group_memberships"][number] & {
  id: UUID;
};

export type MeOrganization =
  components["schemas"]["Me"]["organization_memberships"][number] & {
    organization: UUID;
  };

export type Me = Except<
  components["schemas"]["Me"],
  | "flags"
  | "is_onboarded"
  | "organization"
  | "organization_memberships"
  | "group_memberships"
> & {
  // Serializer method fields
  flags: string[];
  is_onboarded: boolean;
  // Swagger type lists id as optional
  organization: Required<components["schemas"]["Me"]["organization"]> | null;

  // Fix UUID types
  organization_memberships: MeOrganization[];
  group_memberships: MeGroup[];
};

export enum UserRole {
  member = 1,
  admin = 2,
  developer = 3,
  restricted = 4,
}

export type Organization = components["schemas"]["Organization"] & {
  // The `role` property is added in the Redux RTK definition for getOrganizations (see api.ts)
  // WARNING: currently this role is only accurate for Admin. All other users are passed as Restricted even if they have
  // a Member or Developer role on the team
  role: UserRole;
};

export type Group = components["schemas"]["Group"];

export type Database = components["schemas"]["Database"];

export type PackageVersion = components["schemas"]["PackageVersion"];

export type PendingInvitation = components["schemas"]["PendingInvitation"];

export type Package = Except<
  components["schemas"]["Package"],
  "organizations" | "id"
> & {
  id: UUID;
  config: string;
  organizations: UUID[];
  public: boolean;
};

export type PackageUpsertResponse = Except<
  components["schemas"]["Package"],
  "share_dependencies"
> & {
  id: UUID;
  public: boolean;
  organizations: UUID[];
  updated_at: Timestamp;
};

export type SanitizedAuth = components["schemas"]["SanitizedAuth"] & {
  // XXX: update serialize to required id in response type
  id: UUID;
  // Specialized to `SanitizedConfig` to get nominal typing
  config: SanitizedConfig;
  // XXX: update serializer to include proper metadata child serializer
  service: { config: { metadata: Metadata } };
  user?: UUID;
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

/**
 * `/api/recipes/${blueprintId}`
 */
export type BlueprintResponse = {
  // On this endpoint, the sharing and updated_at are in the envelope of the response
  config: UnsavedRecipeDefinition;
  sharing: SharingDefinition;
  updated_at: Timestamp;
};

/**
 * Detailed MarketplaceListing
 * TODO: generate type using swagger
 */
export type MarketplaceListing = {
  id: string;
  package: Record<string, unknown>;
  fa_icon: `${FortAwesomeLibrary} ${string}`;
  icon_color: string;
  image?: {
    url: string;
    alt_text: string;
  };
};

export type ProxyResponseSuccessData = {
  json: unknown;
  status_code: number;
};

export type ProxyResponseErrorData = {
  json: unknown;
  status_code: number;
  message?: string;
  reason?: string;
};

export type ProxyResponseData =
  | ProxyResponseSuccessData
  | ProxyResponseErrorData;

// Partial view of an AxiosResponse for providing common interface local and requests made via proxy
export type RemoteResponse<T = unknown> = Pick<
  AxiosResponse<T>,
  "data" | "status" | "statusText"
> & {
  $$proxied?: boolean;
};
