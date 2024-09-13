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

import { type components } from "@/types/swagger";

export enum UserRole {
  member = 1,
  admin = 2,
  developer = 3,
  restricted = 4,
  manager = 5,
}

export type Organization = components["schemas"]["Organization"] & {
  // The `role` property is added in the Redux RTK definition for getOrganizations (see api.ts)
  // WARNING: currently this role is only accurate for Admin. All other users are passed as Restricted even if they have
  // a Member or Developer role on the team
  role: UserRole;
};

export function transformOrganizationResponse(
  baseQueryReturnValue: Array<components["schemas"]["Organization"]>,
): Organization[] {
  return baseQueryReturnValue.map((apiOrganization) => ({
    ...apiOrganization,

    // Mapping between the API response and the UI model because we need to know whether the user is an admin of
    // the organization

    // Currently API returns all members only for the organization where the user is an admin,
    // hence if the user is an admin, they will have role === UserRole.admin,
    // otherwise there will be no other members listed (no member with role === UserRole.admin).

    // WARNING: currently this role is only accurate for Admin. All other users are passed as Restricted even if
    // they have a Member or Developer role on the team

    role: apiOrganization.members?.some(
      (member: { role: UserRole }) => member.role === UserRole.admin,
    )
      ? UserRole.admin
      : UserRole.restricted,
  }));
}
