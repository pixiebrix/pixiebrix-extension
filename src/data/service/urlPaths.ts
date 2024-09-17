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

import type { RegistryId } from "@/types/registryTypes";
import { type paths } from "@/types/swagger";
import { type Tagged } from "type-fest";

// These paths are not included in the swagger definition
type WebhookPaths = "/api/webhooks/hooks/" | "/api/webhooks/key/";
type pathsWithQueryParams = `${keyof paths}?${string}`;
type ResolvedUrlPath<P extends keyof paths> = Tagged<string, "resolvedPath", P>;

type PathsValues = Record<
  string,
  | keyof paths
  | pathsWithQueryParams
  | WebhookPaths
  | ((...args: any[]) => ResolvedUrlPath<keyof paths>)
>;

const fillPathTemplate = <P extends keyof paths>(
  path: P,
  values: Record<string, string>,
): ResolvedUrlPath<P> => {
  let filledPath: string = path;
  for (const [key, value] of Object.entries(values)) {
    filledPath = filledPath.replace(`{${key}}`, value);
  }

  return filledPath as ResolvedUrlPath<P>;
};

export const API_PATHS = {
  BRICKS: "/api/bricks/",
  BRICK: (id: string) => fillPathTemplate("/api/bricks/{id}/", { id }),
  BRICK_VERSIONS: (id: string) =>
    fillPathTemplate("/api/bricks/{id}/versions/", { id }),

  DATABASES: "/api/databases/",
  DATABASE_RECORDS: (databaseId: string) =>
    fillPathTemplate("/api/databases/{database_pk}/records/", {
      database_pk: databaseId,
    }),
  DATABASE_RECORD_BY_ID: (databaseId: string, recordId: string) =>
    fillPathTemplate("/api/databases/{database_pk}/records/{key}/", {
      database_pk: databaseId,
      key: recordId,
    }),

  DEPLOYMENTS: "/api/deployments/",
  DEPLOYMENT_ALERTS: (deploymentId: string) =>
    fillPathTemplate("/api/deployments/{deployment_pk}/alerts/", {
      deployment_pk: deploymentId,
    }),

  USER_DEPLOYMENTS: "/api/me/deployments/",

  FEATURE_FLAGS: "/api/me/",

  GROUP_DATABASES: (groupId: string) =>
    fillPathTemplate("/api/groups/{group_pk}/databases/", {
      group_pk: groupId,
    }),

  INTEGRATIONS: "/api/services/",
  INTEGRATIONS_SHARED: "/api/services/shared/",
  INTEGRATIONS_SHARED_SANITIZED: "/api/services/shared/?meta=1",

  MARKETPLACE_LISTINGS: "/api/marketplace/listings/",
  MARKETPLACE_TAGS: "/api/marketplace/tags/",

  ME: "/api/me/",
  ME_INVITATIONS: "/api/invitations/me/",
  ME_MILESTONES: "/api/me/milestones/",
  ME_SETTINGS: "/api/settings/",

  MOD: (modId: RegistryId) =>
    fillPathTemplate("/api/recipes/{name}/", {
      name: encodeURIComponent(modId),
    }),
  MOD_COMPONENTS_ALL: "/api/extensions/",

  ONBOARDING_STARTER_BLUEPRINTS: "/api/onboarding/starter-blueprints/",

  ORGANIZATIONS: "/api/organizations/",
  ORGANIZATION_AUTH_URL_PATTERNS: (organizationId: string) =>
    fillPathTemplate(
      "/api/organizations/{organization_pk}/auth-url-patterns/",
      { organization_pk: organizationId },
    ),
  ORGANIZATION_DATABASES: (organizationId: string) =>
    fillPathTemplate("/api/organizations/{organization_pk}/databases/", {
      organization_pk: organizationId,
    }),
  ORGANIZATION_GROUPS: (organizationId: string) =>
    fillPathTemplate("/api/organizations/{organization_pk}/groups/", {
      organization_pk: organizationId,
    }),
  ORGANIZATION_THEME: (organizationId: string) =>
    fillPathTemplate("/api/organizations/{organization_id}/theme/", {
      organization_id: organizationId,
    }),

  PROXY: "/api/proxy/",

  REGISTRY_BRICKS: "/api/registry/bricks/",
  REGISTRY_BRICK: (id: RegistryId) =>
    fillPathTemplate("/api/registry/bricks/{name}/", {
      name: encodeURIComponent(id),
    }),
  REGISTRY_UPDATES: "/api/registry/updates/",

  TELEMETRY_ERRORS: "/api/telemetry/errors/",
  TELEMETRY_EVENTS: "/api/events/",
  TELEMETRY_IDENTIFY_USER: "/api/identify/",

  WEBHOOKS: "/api/webhooks/hooks/",
  WEBHOOKS_KEY: "/api/webhooks/key/",
} as const satisfies PathsValues;

export const UI_PATHS = {
  MOD_ACTIVATE: (modId: RegistryId, isReactivate?: boolean) =>
    `marketplace/activate/${
      encodeURIComponent(modId) + (isReactivate ? "?reinstall=1" : "")
    }`,
  WORKSHOP_BRICK: (id: string) => `/workshop/bricks/${id}`,
};
