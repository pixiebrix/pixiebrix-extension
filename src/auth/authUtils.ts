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
  type UserDataUpdate,
  type AuthState,
  type AuthUserOrganization,
  type OrganizationAuthState,
} from "@/auth/authTypes";
import { type Nullishable } from "@/utils/nullishUtils";
import { type MeOrganizationMembership } from "@/data/model/MeOrganizationMembership";
import { convertToLegacyUserRole } from "@/data/model/UserOrganizationMembershipRole";
import { type Me } from "@/data/model/Me";

function selectOrganizations(
  organizationMemberships: Nullishable<MeOrganizationMembership[]>,
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
    // TODO: Review Required/Partial in Me type
    //  https://github.com/pixiebrix/pixiebrix-extension/issues/7725
    /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion
    -- email is always present, pending above type refactoring */
    email: email!,
    organizationId: primaryOrganization?.organizationId ?? null,
    telemetryOrganizationId: telemetryOrganization?.organizationId ?? null,
    organizations,
    groups,
    partner: partner ?? null,
    enforceUpdateMillis: enforceUpdateMillis ?? null,
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
  const organization: OrganizationAuthState | null =
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
    milestones,
    partner,
    enforceUpdateMillis,
  };
}
