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

import { RegistryId, UUID } from "@/core";
import { Me } from "@/types/contract";
import { Except } from "type-fest";

export interface AuthOption {
  label: string;
  /** The UUID of the auth credential **/
  value: UUID;
  serviceId: RegistryId;
  local: boolean;
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
  organizationId: string;
  /**
   * The user's organization for engagement and error attribution
   */
  telemetryOrganizationId: string;
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
   * Groups the user is a member of
   */
  groups: Array<{
    id: UUID;
    name: string;
  }>;
}>;

// Exclude tenant information in updates (these are only updated on linking)
export type UserDataUpdate = Required<Except<UserData, "hostname" | "user">>;

export const USER_DATA_UPDATE_KEYS: Array<keyof UserDataUpdate> = [
  "email",
  "organizationId",
  "telemetryOrganizationId",
  "organizations",
  "groups",
  "flags",
];

export interface TokenAuthData extends UserData {
  token: string;
}

type OrganizationAuthState = {
  readonly id: string;
  readonly name: string;
  readonly scope?: string;
};

export type AuthState = {
  readonly userId?: string | null;

  readonly email?: string | null;

  readonly scope?: string | null;

  /**
   * True if the user is authenticated with PixieBrix
   */
  readonly isLoggedIn: boolean;

  readonly isOnboarded: boolean;

  /**
   * True if running in a browser extension context. (False on the Admin Console app)
   */
  readonly extension: boolean;

  /**
   *  The SSO organization associated with the user's email domain
   */
  readonly organization?: OrganizationAuthState | null;

  readonly organizations: Array<{
    id: UUID;
    name: string;
    role: Me["organization_memberships"][number]["role"];
  }>;

  readonly groups: Array<{
    id: UUID;
    name: string;
  }>;

  /**
   * List of feature flags for the user.
   */
  readonly flags: string[];
};

export type AuthRootState = {
  auth: AuthState;
};
