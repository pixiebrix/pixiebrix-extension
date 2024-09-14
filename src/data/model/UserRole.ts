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

import { type RequiredOrganizationRoleResponse } from "@/data/service/responseTypeHelpers";
import { type ValueOf } from "type-fest";

export enum LegacyUserRole {
  member = 1,
  admin = 2,
  developer = 3,
  restricted = 4,
  manager = 5,
}

export const UserRole = {
  member: "member",
  admin: "admin",
  developer: "developer",
  restricted: "restricted",
  manager: "manager",
} as const;

export type UserRoleType = ValueOf<typeof UserRole>;

export function transformUserRoleResponse(
  response: RequiredOrganizationRoleResponse,
): UserRoleType {
  switch (response) {
    case 1: {
      return UserRole.member;
    }

    case 2: {
      return UserRole.admin;
    }

    case 3: {
      return UserRole.developer;
    }

    case 4: {
      return UserRole.restricted;
    }

    case 5: {
      return UserRole.manager;
    }

    default: {
      const exhaustiveCheck: never = response;
      throw new Error(`Invalid legacy user role: ${exhaustiveCheck}`);
    }
  }
}

export function convertToUserRole(
  userOrganizationMembershipRole: UserRoleType,
): LegacyUserRole {
  switch (userOrganizationMembershipRole) {
    case UserRole.member: {
      return LegacyUserRole.member;
    }

    case UserRole.admin: {
      return LegacyUserRole.admin;
    }

    case UserRole.developer: {
      return LegacyUserRole.developer;
    }

    case UserRole.restricted: {
      return LegacyUserRole.restricted;
    }

    case UserRole.manager: {
      return LegacyUserRole.manager;
    }

    default: {
      const exhaustiveCheck: never = userOrganizationMembershipRole;
      throw new Error(`Invalid user role: ${exhaustiveCheck}`);
    }
  }
}
