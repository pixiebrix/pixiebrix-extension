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

/**
 * Type contract between the backend and front-end.
 */
import { type components } from "@/types/swagger";
import { type Except, type SetRequired } from "type-fest";
import { type AxiosResponse } from "axios";
import type { IconName, IconPrefix } from "@fortawesome/free-solid-svg-icons";
import { type Timestamp, type UUID } from "@/types/stringTypes";
import {
  type SanitizedConfig,
  type SecretsConfig,
} from "@/integrations/integrationTypes";
import {
  type DefinitionKind,
  type Metadata,
  type RegistryId,
  type SemVerString,
} from "@/types/registryTypes";
import {
  type ModDefinition,
  type UnsavedModDefinition,
} from "@/types/modDefinitionTypes";
import { type OptionsArgs } from "@/types/runtimeTypes";
import { type Nullishable } from "@/utils/nullishUtils";

export type Group = components["schemas"]["Group"];

export type Database = components["schemas"]["Database"];

/**
 * @deprecated see https://github.com/pixiebrix/pixiebrix-extension/issues/7692
 */
// TODO remove in https://github.com/pixiebrix/pixiebrix-extension/issues/7692
export type PackageVersionDeprecated = SetRequired<
  components["schemas"]["PackageVersionDeprecated"],
  "updated_at" | "created_at" | "id"
>;

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

/**
 * An integration configuration stored on the PixieBrix server.
 */
export type RemoteIntegrationConfig = Except<
  components["schemas"]["SanitizedAuth"],
  "config"
> & {
  id: UUID;

  /**
   * The configuration for the integration. As of 1.7.34, this may include sensitive information if pushdown is enabled.
   */
  // Specialized to get nominal typing
  config: SanitizedConfig | SecretsConfig;

  // XXX: update serializer to include proper metadata child serializer
  service: Except<
    components["schemas"]["SanitizedAuth"]["service"],
    "config"
  > & {
    name: RegistryId;
    // Only pick relevant types for the extension
    config: { metadata: Metadata };
  };

  user?: UUID;
};

export type Deployment = components["schemas"]["DeploymentDetail"] & {
  id: UUID;
  options_config: OptionsArgs;
  package: NonNullable<components["schemas"]["DeploymentDetail"]["package"]> & {
    package_id: RegistryId;
  };
  organization?: components["schemas"]["DeploymentDetail"]["organization"] & {
    id: UUID;
  };
};

export type DeploymentPayload = Partial<Deployment> & {
  includeDependencies?: boolean;
};

/**
 * Metadata for an editable package in the registry. See PackageMetaSerializer.
 */
export type EditablePackageMetadata = components["schemas"]["PackageMeta"] & {
  id: UUID;

  name: RegistryId;

  /**
   * Backend display name for the Package.kind. WARNING: different names/capitalization than the frontend types.
   * @see https://github.com/pixiebrix/pixiebrix-app/blob/be1c486eba393e3c8e2f99401f78af5958b4060b/api/models/registry.py#L210-L210
   * @see DefinitionKind
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
  kind: DefinitionKind;

  // PackageConfigListSerializer adds updated_at and sharing to the PackageConfigList response:
  // https://github.com/pixiebrix/pixiebrix-app/blob/368a0116edad2c115ae370b651f109619e621745/api/serializers/brick.py#L139-L139

  updated_at: Timestamp;

  // The exact shape isn't used for now in the extension. So keep as UnknownObject
  sharing: UnknownObject;
};

export type PackageConfigDetail = Except<
  components["schemas"]["PackageConfig"],
  "config"
> & {
  /**
   * Package registry id.
   */
  name: RegistryId;

  /**
   * The UnsavedModDefinition for the PackageVersion.
   *
   * NOTE: UnsavedModDefinition vs. ModDefinition distinction is a bit confusing. UnsavedModDefinition is raw
   * content stored with the configuration. ModDefinition has been decorated with sharing information.
   *
   * @see UnsavedModDefinition
   * @see ModDefinition
   */
  config: UnsavedModDefinition;
};

/**
 * Response shape from `/api/recipes/${recipeId}/`
 * @deprecated uses deprecated `/api/recipes/${recipeId}` endpoint that will be retired
 */
// TODO: change shape in https://github.com/pixiebrix/pixiebrix-app/issues/4355. Keeping name as "recipe" to be clearer
//  that is corresponds to the deprecated endpoint
export type RetrieveRecipeResponse = {
  // On this endpoint, the sharing and updated_at are in the envelope of the response
  config: UnsavedModDefinition;
  sharing: ModDefinition["sharing"];
  updated_at: Timestamp;
};

// The fa_icon database value is a string with Font Awesome prefix and name, e.g. "fas fa-coffee"
export type IconStringDefinition = `${IconPrefix} ${IconName}`;

/**
 * @see components["schemas"]["Tag"]
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
  deployment: Nullishable<UUID>;
  organization: Nullishable<UUID>;
  user_agent_extension_version: SemVerString;
};

/**
 * Force updates available for a list of packages.
 * There is no auto-generated swagger Type for this because it serializes
 * the Package config, which is a JSON object.
 * @see ModDefinition
 */
export type PackageVersionUpdates = {
  updates: Array<{
    backwards_compatible: ModDefinition | null;
    name: RegistryId;
  }>;
};

export type OrganizationAuthUrlPattern =
  components["schemas"]["OrganizationAuthUrlPattern"];

/**
 * Deployment installed on the client. A deployment may be "activated" locally but not paused
 * (see DeploymentContext.active)
 *
 * See https://github.com/pixiebrix/pixiebrix-app/blob/71cdfd8aea1992ae7cac7cb6fd049d38f7135c10/api/serializers/deployments.py#L109-L109
 *
 * @see DeploymentTelemetrySerializer
 */
export type ActivatedDeployment = {
  deployment: UUID;
  // Use legacy names - these are passed to the server
  blueprint: RegistryId;
  blueprintVersion: SemVerString;
};

export type AssetPreUpload = components["schemas"]["AssetPreUpload"];
