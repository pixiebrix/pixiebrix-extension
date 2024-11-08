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

import type { RegistryId } from "../../types/registryTypes";
import { type paths } from "../../types/swagger";

// These paths are not included in the swagger definition
type WebhookPaths = "/api/webhooks/hooks/" | "/api/webhooks/key/";
type PathsWithQueryParams = `${keyof paths}?${string}`;

type TemplateStringFromPath<T extends string> = string extends T
  ? string
  : T extends `${infer Start}{${string}}/${infer Rest}`
    ? `${Start}${string}/${TemplateStringFromPath<Rest>}`
    : T extends `${infer Start}{${string}}`
      ? `${Start}${string}`
      : T;

type PathsValues = Record<
  string,
  | keyof paths
  | PathsWithQueryParams
  | WebhookPaths
  | ((...args: any[]) => TemplateStringFromPath<keyof paths>)
>;

export const API_PATHS = {
  BRICKS: "/api/bricks/",
  BRICK: (id: string) => `/api/bricks/${id}/`,
  BRICK_VERSIONS: (id: string) => `/api/bricks/${id}/versions/`,

  DATABASES: "/api/databases/",
  DATABASE_RECORDS: (databaseId: string) =>
    `/api/databases/${databaseId}/records/`,
  DATABASE_RECORD_BY_ID: (databaseId: string, recordId: string) =>
    `/api/databases/${databaseId}/records/${recordId}/`,

  DEPLOYMENTS: "/api/deployments/",
  DEPLOYMENT_ALERTS: (deploymentId: string) =>
    `/api/deployments/${deploymentId}/alerts/`,

  USER_DEPLOYMENTS: "/api/me/deployments/",
  USER_DEPLOYMENT: (deploymentId: string) =>
    `/api/me/deployments/${deploymentId}/`,

  FEATURE_FLAGS: "/api/me/",

  GROUP_DATABASES: (groupId: string) => `/api/groups/${groupId}/databases/`,

  INTEGRATIONS: "/api/services/",
  INTEGRATIONS_SHARED: "/api/services/shared/",
  INTEGRATIONS_SHARED_SANITIZED: "/api/services/shared/?meta=1",

  MARKETPLACE_LISTINGS: "/api/marketplace/listings/",
  MARKETPLACE_TAGS: "/api/marketplace/tags/",

  ME: "/api/me/",
  ME_INVITATIONS: "/api/invitations/me/",
  ME_MILESTONES: "/api/me/milestones/",
  ME_SETTINGS: "/api/settings/",

  MOD: (modId: RegistryId) => `/api/recipes/${encodeURIComponent(modId)}/`,
  MOD_COMPONENTS_ALL: "/api/extensions/",

  ONBOARDING_STARTER_BLUEPRINTS: "/api/onboarding/starter-blueprints/",

  ORGANIZATIONS: "/api/organizations/",
  ORGANIZATION_AUTH_URL_PATTERNS: (organizationId: string) =>
    `/api/organizations/${organizationId}/auth-url-patterns/`,
  ORGANIZATION_DATABASES: (organizationId: string) =>
    `/api/organizations/${organizationId}/databases/`,
  ORGANIZATION_GROUPS: (organizationId: string) =>
    `/api/organizations/${organizationId}/groups/`,
  ORGANIZATION_THEME: (organizationId: string) =>
    `/api/organizations/${organizationId}/theme/`,

  PROXY: "/api/proxy/",

  REGISTRY_BRICKS: "/api/registry/bricks/",
  REGISTRY_BRICK: (id: RegistryId) =>
    `/api/registry/bricks/${encodeURIComponent(id)}/`,
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
} as const;
