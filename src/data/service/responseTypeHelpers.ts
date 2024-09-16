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

import { type SetRequired } from "type-fest";
import type { components } from "@/types/swagger";

export type RequiredMePartnerResponse = SetRequired<
  components["schemas"]["Me"],
  "partner"
>["partner"];

export type RequiredMeOrganizationResponse = SetRequired<
  components["schemas"]["Me"],
  "organization"
>["organization"];

export type RequiredControlRoomResponse = SetRequired<
  RequiredMeOrganizationResponse,
  "control_room"
>["control_room"];

export type RequiredMeOrganizationMembershipResponse = SetRequired<
  components["schemas"]["Me"],
  "organization_memberships"
>["organization_memberships"][number];

export type RequiredMeGroupMembershipResponse = SetRequired<
  components["schemas"]["Me"],
  "group_memberships"
>["group_memberships"][number];

export type RequiredMeOrganizationThemeResponse = SetRequired<
  RequiredMeOrganizationResponse,
  "theme"
>["theme"];

export type RequiredMeMilestoneResponse = SetRequired<
  components["schemas"]["Me"],
  "milestones"
>["milestones"][number];

export type RequiredMePartnerPrincipalResponse = SetRequired<
  components["schemas"]["Me"],
  "partner_principals"
>["partner_principals"][number];

export type RequiredOrganizationRoleResponse = 1 | 2 | 3 | 4 | 5;
