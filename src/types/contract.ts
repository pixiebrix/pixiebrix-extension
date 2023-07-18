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

/**
 * Type contract between the backend and front-end.
 */
import { type components } from "@/types/swagger";
import { type Except, type JsonObject } from "type-fest";
import { type AxiosResponse } from "axios";
import {
  type IconName,
  type IconPrefix,
} from "@fortawesome/free-solid-svg-icons";
import { type Timestamp, type UUID } from "@/types/stringTypes";
import { type SanitizedConfig } from "@/types/integrationTypes";
import {
  type RegistryId,
  type SemVerString,
  type Metadata,
} from "@/types/registryTypes";
import {
  type ModDefinition,
  type UnsavedModDefinition,
} from "@/types/modDefinitionTypes";
import { type ActivatedModComponent } from "@/types/modComponentTypes";
import { type UnknownObject } from "@/types/objectTypes";
import { type OptionsArgs } from "@/types/runtimeTypes";

type MeGroup = components["schemas"]["Me"]["group_memberships"][number] & {
  id: UUID;
};

type MeMembershipOrganization = Except<
  components["schemas"]["Me"]["organization_memberships"][number],
  "is_deployment_manager"
> & {
  organization: UUID;
  // The type is wrong in the Swagger
  is_deployment_manager: boolean;
};

type MeOrganization = Required<components["schemas"]["Me"]["organization"]> & {
  id: UUID;
};

export type Me = Except<
  components["schemas"]["Me"],
  | "flags"
  | "is_onboarded"
  | "organization"
  | "telemetry_organization"
  | "organization_memberships"
  | "group_memberships"
> & {
  // Serializer method fields
  flags: string[];
  is_onboarded: boolean;

  // Fix UUID types
  organization: MeOrganization | null;
  telemetry_organization: MeOrganization | null;
  organization_memberships: MeMembershipOrganization[];
  group_memberships: MeGroup[];
};

export type Milestone = components["schemas"]["Milestone"];

export enum UserRole {
  member = 1,
  admin = 2,
  developer = 3,
  restricted = 4,
  manager = 5,
}

export type Organization = components["schemas"]["Organization"] & {
  // The `role` property is added in the Redux RTK definition for getOrganizations (see api.ts)
  // WARNING: currently this role is only accurate for Admin. All other users are passed as Restricted even if they have
  // a Member or Developer role on the team
  role: UserRole;
};

export type OrganizationTheme = components["schemas"]["Organization"]["theme"];

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

export type SanitizedAuthService = Except<
  components["schemas"]["SanitizedAuth"]["service"],
  "config"
> & { config: { metadata: Metadata } };

export type SanitizedAuth = Except<
  components["schemas"]["SanitizedAuth"],
  "config"
> & {
  // XXX: update serialize to required id in response type
  id: UUID;
  // Specialized to `SanitizedConfig` to get nominal typing
  config: SanitizedConfig;
  // XXX: update serializer to include proper metadata child serializer
  service: SanitizedAuthService;
  user?: UUID;
};

export type Deployment = Except<
  components["schemas"]["DeploymentDetail"],
  "id" | "package"
> & {
  id: UUID;
  options_config: OptionsArgs;
  package: Except<
    components["schemas"]["DeploymentDetail"]["package"],
    // Patch types for the following properties which our automatic schema generation generated the wrong types for
    "config" | "id" | "package_id"
  > & {
    id: UUID;
    package_id: RegistryId;
    config: ModDefinition;
  };
};

/**
 * Metadata for an editable package in the registry. See PackageMetaSerializer.
 */
export type EditablePackageMetadata = components["schemas"]["PackageMeta"] & {
  id: UUID;

  name: RegistryId;

  /**
   * Backend display name for the Package.kind.
   * @see https://github.com/pixiebrix/pixiebrix-app/blob/be1c486eba393e3c8e2f99401f78af5958b4060b/api/models/registry.py#L210-L210
   */
  kind: "Blueprint" | "Service" | "Block" | "Reader" | "Foundation";

  // Nominal typing to help distinguish from registry Metadata
  _editableBrickBrand: never;
};

export type RegistryPackage = Pick<
  components["schemas"]["PackageConfigList"],
  "kind" | "metadata"
> & {
  // XXX: update serializer to include proper child serializer
  metadata: Metadata;

  /**
   * Valid `kind` value in the YAML definition.
   * Note that EditablePackageMetadata uses the backend's display name for this field
   * @see https://github.com/pixiebrix/pixiebrix-app/blob/43f0a4b81d8b7aaaf11adbe7fd8e4530ca4b8bf0/api/serializers/brick.py#L204-L204
   */
  kind: "component" | "extensionPoint" | "recipe" | "service" | "reader";
};

/**
 * @deprecated because ModDefinition will be used for singluar mods
 * A personal user extension synced/saved to the cloud.
 */
export type StandaloneModDefinition<Config extends UnknownObject = JsonObject> =
  Except<ActivatedModComponent<Config>, "active"> & {
    _remoteUserExtensionBrand: never;
    _deployment: undefined;
    _recipe: undefined;
  };

/**
 * `/api/recipes/${recipeId}`
 */
export type RecipeResponse = {
  // On this endpoint, the sharing and updated_at are in the envelope of the response
  config: UnsavedModDefinition;
  sharing: ModDefinition["sharing"];
  updated_at: Timestamp;
};

// The fa_icon database value is a string with Font Awesome prefix and name, e.g. "fas fa-coffee"
export type IconStringDefinition = `${IconPrefix} ${IconName}`;

/**
 * @See components["schemas"]["Tag"]
 */
export type MarketplaceTag = Omit<components["schemas"]["Tag"], "fa_icon"> & {
  // See IconStringDefinition for type explanation
  fa_icon: IconStringDefinition | null;
};

export type MarketplaceListing = Omit<
  components["schemas"]["MarketplaceListing"],
  "fa_icon"
> & {
  // See IconStringDefinition for type explanation
  fa_icon: IconStringDefinition | null;
};

type ProxyResponseSuccessData = {
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

// Exclude fields assigned by the server. (And in the future might not be included on the response).
// Can't use Required. For blueprint_version, etc. the backend expects the property to be excluded or to have a value
export type ErrorItem = Except<
  components["schemas"]["ErrorItem"],
  "user" | "user_extension"
> & {
  deployment: UUID | null;
  organization: UUID | null;
  user_agent_extension_version: SemVerString;
};

export type PackageVersionUpdates = {
  updates: Array<{
    backwards_compatible: ModDefinition | null;
    name: RegistryId;
  }>;
};
