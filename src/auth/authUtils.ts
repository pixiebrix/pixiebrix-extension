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

import { type Me } from "@/types/contract";
import { type UserDataUpdate, type AuthState } from "@/auth/authTypes";

// Used by the app
function selectOrganizations(
  organizationMemberships: Me["organization_memberships"],
): AuthState["organizations"] {
  if (organizationMemberships == null) {
    return [];
  }

  return organizationMemberships.map(
    ({
      organization,
      organization_name,
      control_room,
      role,
      scope,
      is_deployment_manager,
    }) => ({
      id: organization,
      name: organization_name,
      control_room,
      role,
      scope,
      isDeploymentManager: is_deployment_manager,
    }),
  );
}

export function selectUserDataUpdate({
  email,
  organization,
  telemetry_organization: telemetryOrganization,
  organization_memberships: organizationMemberships = [],
  group_memberships = [],
  partner,
  enforce_update_millis: enforceUpdateMillis,
  partner_principals: partnerPrincipals = [],
}: Me): UserDataUpdate {
  const organizations = selectOrganizations(organizationMemberships);
  const groups = group_memberships.map(({ id, name }) => ({ id, name }));

  return {
    // TODO: Review Required/Partial in Me type
    // https://github.com/pixiebrix/pixiebrix-extension/issues/7725
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion
    email: email!,
    organizationId: organization?.id ?? null,
    telemetryOrganizationId: telemetryOrganization?.id ?? null,
    organizations,
    groups,
    partner: partner ?? null,
    enforceUpdateMillis: enforceUpdateMillis ?? null,
    partnerPrincipals,
  };
}

export function selectExtensionAuthState({
  id,
  email,
  scope,
  organization,
  telemetry_organization,
  is_onboarded: isOnboarded,
  test_account: isTestAccount = false,
  milestones = [],
  organization_memberships: organizationMemberships = [],
  group_memberships = [],
  partner,
  enforce_update_millis: enforceUpdateMillis,
}: Me): AuthState {
  const organizations = selectOrganizations(organizationMemberships);
  const groups = group_memberships.map(({ id, name }) => ({ id, name }));

  return {
    userId: id,
    email,
    scope,
    isLoggedIn: true,
    isOnboarded,
    isTestAccount,
    extension: true,
    organization,
    telemetryOrganizationId: telemetry_organization?.id,
    organizations,
    groups,
    milestones,
    partner,
    enforceUpdateMillis,
  };
}
