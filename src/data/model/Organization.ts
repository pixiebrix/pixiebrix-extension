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

import {
  transformOrganizationMembershipResponse,
  type OrganizationMembership,
} from "@/data/model/OrganizationMemberships";
import {
  transformOrganizationThemeResponse,
  type OrganizationTheme,
} from "@/data/model/OrganizationTheme";
import {
  type UserRoleType,
  transformUserRoleResponse,
} from "@/data/model/UserRole";
import { validateUUID } from "@/types/helpers";
import { type Timestamp, type UUID } from "@/types/stringTypes";
import { type components } from "@/types/swagger";

export type Organization = {
  /**
   * The organization's ID.
   */
  organizationId: UUID;
  /**
   * The organization's name.
   */
  organizationName: string;
  /**
   * The organization's memberships.
   */
  memberships: OrganizationMembership[] | null;
  /**
   * The organization's scope.
   */
  scope: string | null;
  /**
   * The organization's default role.
   */
  defaultRole: UserRoleType | null;
  /**
   * The organization's partner.
   */
  partner: string | null;
  /**
   * The organization's enforce update millis.
   */
  enforceUpdateMillis: number | null;
  /**
   * The organization's UI theme.
   */
  theme: OrganizationTheme | null;

  trialEndTimestamp: Timestamp | null;
};

export function transformOrganizationResponse(
  baseQueryReturnValue: Array<components["schemas"]["Organization"]>,
): Organization[] {
  return baseQueryReturnValue.map((apiOrganization) => ({
    organizationId: validateUUID(apiOrganization.id),
    organizationName: apiOrganization.name,
    memberships: transformOrganizationMembershipResponse(
      apiOrganization.members,
    ),
    scope: apiOrganization.scope ?? null,
    defaultRole: apiOrganization.default_role
      ? transformUserRoleResponse(apiOrganization.default_role)
      : null,
    partner: apiOrganization.partner ?? null,
    enforceUpdateMillis: apiOrganization.enforce_update_millis ?? null,
    theme: apiOrganization.theme
      ? transformOrganizationThemeResponse(apiOrganization.theme)
      : null,
    trialEndTimestamp: apiOrganization.trial_end_timestamp ?? null,
  }));
}
