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
  ME: "/api/me/",
  DATABASES: "/api/databases/",
  ORGANIZATION_DATABASES: (organizationId: string) =>
    `/api/organizations/${organizationId}/databases/`,
  GROUP_DATABASES: (groupId: string) => `/api/groups/${groupId}/databases/`,
  SERVICES: "/api/services/",
  SHARED_SERVICES: "/api/services/shared/",
  ORGANIZATIONS: "/api/organizations/",
  ORGANIZATION_GROUPS: (organizationId: string) =>
    `/api/organizations/${organizationId}/groups/`,
  MARKETPLACE_LISTINGS: "/api/marketplace/listings/",
  MARKETPLACE_TAGS: "/api/marketplace/tags/",
  BRICKS: "/api/bricks/",
  RECIPE: (modId: string) => `/api/recipes/${encodeURIComponent(modId)}/`,
  BRICK: (id: string) => `/api/bricks/${id}/`,
  INVITATIONS_ME: "/api/invitations/me/",
  WEBHOOKS_KEY: "/api/webhooks/key/",
  BRICK_VERSIONS: (id: string) => `/api/bricks/${id}/versions/`,
  SETTINGS: "/api/settings/",
  ONBOARDING_STARTER_BLUEPRINTS: "/api/onboarding/starter-blueprints/",
  ME_MILESTONES: "/api/me/milestones/",
  DEPLOYMENTS: "/api/deployments/",
};
