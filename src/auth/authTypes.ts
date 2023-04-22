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

import {
  type Me,
  type OrganizationTheme,
  type Milestone,
} from "@/types/contract";
import { type Except } from "type-fest";
import { type UUID } from "@/types/stringTypes";
import { type RegistryId } from "@/types/registryTypes";

export type AuthSharing = "private" | "shared" | "built-in";
export interface AuthOption {
  label: string;
  /** The UUID of the auth credential **/
  value: UUID;
  serviceId: RegistryId;
  local: boolean;
  sharingType: AuthSharing;
}

export type UserData = Partial<{
  /**
   * The email of the user
   */
  email: string;
  /**
   * The id of the user
   */
  user: UUID;
  /**
   * The hostname of the PixieBrix instance.
   */
  hostname: string;
  /**
   * The user's primary organization.
   */
  organizationId: UUID;
  /**
   * The user's organization for engagement and error attribution
   */
  telemetryOrganizationId: UUID;
  /**
   * Feature flags
   */
  flags: string[];
  /**
   * Organizations the user is a member of
   */
  organizations: Array<{
    id: UUID;
    name: string;
  }>;
  /**
   * Groups the user is a member of.
   */
  groups: Array<{
    id: UUID;
    name: string;
  }>;
  /**
   * Number of milliseconds after which to enforce browser extension and manual deployment updates, or `null` to
   * allow the user to snooze updates.
   * @since 1.7.1
   */
  enforceUpdateMillis: number | null;
  /**
   * The partner, controlling theme, documentation links, etc.
   *
   * Introduced to support partner Community Edition users because they are not part of an organization.
   *
   * @since 1.7.14
   */
  readonly partner?: Me["partner"];
  /**
   * The partner principals. Currently, just the Automation Anywhere Control Room principal if applicable.
   * @since 1.7.16
   */
  readonly partnerPrincipals?: Me["partner_principals"];
}>;

// Exclude tenant information in updates (these are only updated on linking)
export type UserDataUpdate = Required<Except<UserData, "hostname" | "user">>;

/**
 * User data keys (in addition to the token) to store in chrome.storage.local when linking the extension.
 * @see updateUserData
 */
export const USER_DATA_UPDATE_KEYS: Array<keyof UserDataUpdate> = [
  "email",
  "organizationId",
  "telemetryOrganizationId",
  "organizations",
  "groups",
  "flags",
  "enforceUpdateMillis",
  "partner",
  "partnerPrincipals",
];

export interface TokenAuthData extends UserData {
  token: string;
}

export type PartnerAuthData = {
  /**
   * The service auth configuration for authenticating with the PixieBrix API.
   */
  authId: UUID | null;
  /**
   * The JWT bearer token corresponding to the authId.
   */
  token: string | null;
  /**
   * The refresh token, if `offline_access` was included in scope.
   * @since 1.7.15
   */
  refreshToken: string | null;

  /**
   * Extra HTTP headers to send with every request.
   */
  extraHeaders: Record<string, string> | null;
};

export type OrganizationAuthState = {
  /**
   * The id of the organization.
   */
  readonly id: UUID;
  /**
   * The human-readable name of the organization.
   */
  readonly name: string;
  /**
   * The package scope of the organization, or null if not set.
   */
  readonly scope?: string;
  /**
   * The optional custom theme configured for this Organization
   */
  readonly theme?: OrganizationTheme;
  /**
   * The Automation Anywhere Control Room information
   */
  readonly control_room?: Me["organization"]["control_room"];
};

export type AuthUserOrganization = {
  /**
   * ID of the organization. NOT the id of the membership.
   */
  id: UUID;
  /**
   * Name of the organization.
   */
  name: string;
  /**
   * The user's role within the organization.
   */
  role: Me["organization_memberships"][number]["role"];
  /**
   * The organization's brick scope, or null if not set.
   */
  scope?: string | null;
  /**
   * True if the user is a manager of at least one team deployment.
   */
  isDeploymentManager: boolean;
  /**
   * True if the organization's compliance auth token is set
   */
  hasComplianceAuthToken: boolean;
};

export type AuthState = {
  /**
   * The PixieBrix userId, or null if the user is not authenticated
   */
  readonly userId?: UUID | null;

  readonly email?: string | null;

  /**
   * The user's package scope.
   */
  readonly scope?: string | null;

  /**
   * True if the user is authenticated with PixieBrix
   */
  readonly isLoggedIn: boolean;

  readonly isOnboarded: boolean;

  readonly isTestAccount: boolean;

  /**
   * True if running in a browser extension context. (False on the Admin Console app)
   */
  readonly extension: boolean;

  /**
   *  The primary organization for the user
   */
  readonly organization?: OrganizationAuthState | null;

  /**
   * Organizations the user is a member of
   */
  readonly organizations: AuthUserOrganization[];

  readonly groups: Array<{
    id: UUID;
    name: string;
  }>;

  /**
   * List of feature flags for the user.
   */
  readonly flags: string[];

  /**
   * List of milestones for the user. A Milestone represents progress through the PixieBrix product.
   */
  readonly milestones: Milestone[];

  /**
   * The partner, controlling theme, documentation links, etc.
   */
  readonly partner?: Me["partner"];

  /**
   * Number of milliseconds after which to enforce browser extension and manual deployment updates, or `null` to
   * allow the user to snooze updates.
   *
   * NOTE: applies to both deployments and browser extension updates.
   *
   * @since 1.7.1
   */
  readonly enforceUpdateMillis: number | null;
};

export type AuthRootState = {
  auth: AuthState;
};
