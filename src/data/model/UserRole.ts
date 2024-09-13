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

export enum UserRole {
  member = 1,
  admin = 2,
  developer = 3,
  restricted = 4,
  manager = 5,
}

export const UserRoleName = {
  member: "member",
  admin: "admin",
  developer: "developer",
  restricted: "restricted",
  manager: "manager",
} as const;

export type UserRoleNameType = ValueOf<typeof UserRoleName>;

export function transformUserRoleResponse(
  response: RequiredOrganizationRoleResponse,
): UserRoleNameType {
  switch (response) {
    case 1: {
      return "member";
    }

    case 2: {
      return "admin";
    }

    case 3: {
      return "developer";
    }

    case 4: {
      return "restricted";
    }

    case 5: {
      return "manager";
    }

    default: {
      const exhaustiveCheck: never = response;
      throw new Error(`Invalid legacy user role: ${exhaustiveCheck}`);
    }
  }
}

export function convertToUserRole(
  userOrganizationMembershipRole: UserRoleNameType,
): UserRole {
  switch (userOrganizationMembershipRole) {
    case "member": {
      return UserRole.member;
    }

    case "admin": {
      return UserRole.admin;
    }

    case "developer": {
      return UserRole.developer;
    }

    case "restricted": {
      return UserRole.restricted;
    }

    case "manager": {
      return UserRole.manager;
    }

    default: {
      const exhaustiveCheck: never = userOrganizationMembershipRole;
      throw new Error(`Invalid user role: ${exhaustiveCheck}`);
    }
  }
}
