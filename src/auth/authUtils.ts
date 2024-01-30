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
  type UserDataUpdate,
  type AuthState,
  type OrganizationAuthState,
  type AuthUserOrganization,
} from "@/auth/authTypes";
import { readAuthData } from "@/auth/token";
import { type MeOrganizationMembership } from "@/data/model/MeOrganizationMembership";
import { type Me } from "@/data/model/Me";
import { convertToLegacyUserRole } from "@/data/model/UserOrganizationMembershipRole";

// Used by the app
function selectOrganizations(
  organizationMemberships: MeOrganizationMembership[],
): AuthUserOrganization[] {
  if (organizationMemberships == null) {
    return [];
  }

  return organizationMemberships.map(
    ({
      organizationId,
      organizationName,
      organizationControlRoom,
      userOrganizationRole,
      organizationScope,
      meUserIsDeploymentManager,
    }) => ({
      id: organizationId,
      name: organizationName,
      control_room: organizationControlRoom,
      role: convertToLegacyUserRole(userOrganizationRole),
      scope: organizationScope,
      isDeploymentManager: meUserIsDeploymentManager,
    }),
  );
}

export function selectUserDataUpdate({
  email,
  primaryOrganization,
  telemetryOrganization,
  organizationMemberships,
  groupMemberships,
  featureFlags: flags,
  partner,
  enforceUpdateMillis,
  partnerPrincipals,
}: Me): UserDataUpdate {
  const organizations = selectOrganizations(organizationMemberships);
  const groups = groupMemberships.map(({ groupId, groupName }) => ({
    id: groupId,
    name: groupName,
  }));

  return {
    email,
    organizationId: primaryOrganization?.organizationId,
    telemetryOrganizationId: telemetryOrganization?.organizationId,
    flags,
    organizations,
    groups,
    partner,
    enforceUpdateMillis,
    partnerPrincipals,
  };
}

export function selectExtensionAuthState({
  userId,
  email,
  scope,
  primaryOrganization,
  telemetryOrganization,
  isOnboarded,
  isTestAccount,
  featureFlags: flags,
  userMilestones: milestones,
  organizationMemberships,
  groupMemberships,
  partner,
  enforceUpdateMillis,
}: Me): AuthState {
  const organizations = selectOrganizations(organizationMemberships);
  const groups = groupMemberships.map(({ groupId, groupName }) => ({
    id: groupId,
    name: groupName,
  }));
  const organization: OrganizationAuthState =
    primaryOrganization == null
      ? null
      : {
          id: primaryOrganization.organizationId,
          name: primaryOrganization.organizationName,
          scope: primaryOrganization.scope,
          theme: primaryOrganization.organizationTheme,
          control_room: primaryOrganization.controlRoom,
        };

  return {
    userId,
    email,
    scope,
    isLoggedIn: true,
    isOnboarded,
    isTestAccount,
    extension: true,
    organization,
    telemetryOrganizationId: telemetryOrganization?.organizationId,
    organizations,
    groups,
    flags,
    milestones,
    partner,
    enforceUpdateMillis,
  };
}

/**
 * Returns true if the specified flag is on for the current user.
 * @param flag the feature flag to check
 */
export async function flagOn(flag: string): Promise<boolean> {
  const authData = await readAuthData();
  return authData.flags?.includes(flag);
}
