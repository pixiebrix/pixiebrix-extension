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

export const API_PATHS = {
  BRICKS: "/api/bricks/",
  BRICK: (id: string) => `/api/bricks/${id}/`,
  BRICK_MATCH_ANY: /api\/bricks\/[\w-]*\/$/,
  BRICK_VERSIONS: (id: string) => `/api/bricks/${id}/versions/`,
  BRICK_VERSION_MATCH_ANY: /api\/bricks\/[\w-]*\/versions\/$/,

  DATABASES: "/api/databases/",

  DEPLOYMENTS: "/api/deployments/",

  FEATURE_FLAGS: "/api/me/",

  GROUP_DATABASES: (groupId: string) => `/api/groups/${groupId}/databases/`,

  INVITATIONS_ME: "/api/invitations/me/",

  INTEGRATIONS: "/api/services/",
  INTEGRATIONS_SHARED: "/api/services/shared/",

  MARKETPLACE_LISTINGS: "/api/marketplace/listings/",
  MARKETPLACE_TAGS: "/api/marketplace/tags/",

  ME: "/api/me/",
  ME_MILESTONES: "/api/me/milestones/",

  MOD: (modId: string) => `/api/recipes/${encodeURIComponent(modId)}/`,

  ONBOARDING_STARTER_BLUEPRINTS: "/api/onboarding/starter-blueprints/",

  ORGANIZATIONS: "/api/organizations/",
  ORGANIZATION_DATABASES: (organizationId: string) =>
    `/api/organizations/${organizationId}/databases/`,
  ORGANIZATION_GROUPS: (organizationId: string) =>
    `/api/organizations/${organizationId}/groups/`,

  REGISTRY_BRICKS: "/api/registry/bricks/",

  SETTINGS: "/api/settings/",

  WEBHOOKS_KEY: "/api/webhooks/key/",
};
