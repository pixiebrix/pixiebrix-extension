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

import { type UUID } from "@/types/stringTypes";
import {
  type MeOrganizationMembership,
  transformMeOrganizationMembershipResponse,
} from "@/data/model/MeOrganizationMembership";
import {
  type MeUserGroupMembership,
  transformMeUserGroupMembershipResponse,
} from "@/data/model/MeUserGroupMembership";
import {
  type PartnerPrincipal,
  transformPartnerPrincipalResponse,
} from "@/data/model/PartnerPrincipal";
import {
  transformUserMilestoneResponse,
  type UserMilestone,
} from "@/data/model/UserMilestone";
import {
  type UserPartner,
  transformUserPartnerResponse,
} from "@/data/model/UserPartner";
import { validateUUID } from "@/types/helpers";
import type { components } from "@/types/swagger";
import {
  type MeOrganization,
  transformMeOrganizationResponse,
} from "@/data/model/MeOrganization";

export type Me = {
  /**
   * The user's unique ID.
   */
  readonly userId: UUID;
  /**
   * The me-user's organization memberships
   */
  organizationMemberships: MeOrganizationMembership[];
  /**
   * The me-user's group memberships
   */
  groupMemberships: MeUserGroupMembership[];
  partnerPrincipals: PartnerPrincipal[];
  userMilestones: UserMilestone[];
  /**
   * Whether the user has completed the onboarding flow
   */
  isOnboarded: boolean;
  /**
   * Whether the account is an organization API service account
   */
  isServiceAccount: boolean;
  /**
   * Whether the account is an automated/manual test account
   */
  isTestAccount: boolean;
  /**
   * Number of milliseconds after which to enforce browser extension and
   * manual deployment updates, or `null` to allow the user to snooze updates.
   *
   * NOTE: applies to both deployments and browser extension updates.
   */
  enforceUpdateMillis: number | null;
  /**
   * The user's scope for saving personal mods, if set. A string beginning with "@".
   */
  scope?: string;
  /**
   * The user's email address
   */
  email?: string;
  /**
   * The user's full name
   */
  fullName?: string;
  /**
   * The user's primary organization, if they belong to one
   */
  primaryOrganization?: MeOrganization;
  /**
   * The partner, controlling theme, documentation links, etc.
   */
  partner?: UserPartner;
};

export function transformMeResponse(response: components["schemas"]["Me"]): Me {
  const me: Me = {
    userId: validateUUID(response.id),
    organizationMemberships:
      response.organization_memberships?.map((membership) =>
        transformMeOrganizationMembershipResponse(membership),
      ) ?? [],
    groupMemberships:
      response.group_memberships?.map((membership) =>
        transformMeUserGroupMembershipResponse(membership),
      ) ?? [],
    partnerPrincipals:
      response.partner_principals?.map((principal) =>
        transformPartnerPrincipalResponse(principal),
      ) ?? [],
    userMilestones:
      response.milestones?.map((milestone) =>
        transformUserMilestoneResponse(milestone),
      ) ?? [],
    isOnboarded: response.is_onboarded ?? false,
    isServiceAccount: response.service_account ?? false,
    isTestAccount: response.test_account ?? false,
    // Response can be null/undefined, but don't want to coerce 0 to be null
    enforceUpdateMillis:
      response.enforce_update_millis === undefined
        ? null
        : response.enforce_update_millis,
  };

  if (response.scope) {
    me.scope = response.scope;
  }

  if (response.email) {
    me.email = response.email;
  }

  if (response.name) {
    me.fullName = response.name;
  }

  if (response.organization) {
    me.primaryOrganization = transformMeOrganizationResponse(
      response.organization,
    );
  }

  if (response.partner) {
    me.partner = transformUserPartnerResponse(response.partner);
  }

  return me;
}
