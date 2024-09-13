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
  type OrganizationAuthState,
} from "@/auth/authTypes";
import { type Me } from "@/data/model/Me";
import selectAuthUserOrganizations from "@/auth/selectAuthUserOrganizations";
import {
  readReduxStorage,
  validateReduxStorageKey,
} from "@/utils/storageUtils";
import { type Nullishable } from "@/utils/nullishUtils";
import { anonAuth } from "@/auth/authConstants";
import { UserRole } from "@/data/model/Organization";

const AUTH_SLICE_STORAGE_KEY = validateReduxStorageKey("persist:authOptions");

export async function getUserScope(): Promise<Nullishable<string>> {
  const { scope } = await readReduxStorage(
    AUTH_SLICE_STORAGE_KEY,
    {},
    anonAuth,
  );
  return scope;
}

export function selectUserDataUpdate({
  email,
  primaryOrganization,
  organizationMemberships,
  groupMemberships,
  partner,
  enforceUpdateMillis,
  partnerPrincipals,
}: Me): UserDataUpdate {
  const organizations = selectAuthUserOrganizations(organizationMemberships);
  const groups = groupMemberships.map(({ groupId, groupName }) => ({
    id: groupId,
    name: groupName,
  }));

  return {
    // TODO: Review Required/Partial in Me type
    //  https://github.com/pixiebrix/pixiebrix-extension/issues/7725
    /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    -- email is always present, pending above type refactoring */
    email: email!,
    organizationId: primaryOrganization?.organizationId ?? null,
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
  isOnboarded,
  isTestAccount,
  userMilestones: milestones,
  organizationMemberships,
  groupMemberships,
  partner,
  enforceUpdateMillis,
}: Me): AuthState {
  const organizations = selectAuthUserOrganizations(organizationMemberships);
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
          isEnterprise: primaryOrganization.isEnterprise,
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
    organizations,
    groups,
    milestones,
    partner,
    enforceUpdateMillis,
  };
}

/**
 * Returns true if the role corresponds to permission to edit a package.
 * See https://docs.pixiebrix.com/managing-teams/access-control/roles
 */
export function isPackageEditorRole(role: UserRole): boolean {
  return [UserRole.admin, UserRole.manager, UserRole.developer].includes(role);
}
