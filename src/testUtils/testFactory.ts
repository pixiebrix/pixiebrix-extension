/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { define } from "cooky-cutter";
import { AuthState } from "@/auth/authTypes";
import { uuidSequence } from "@/testUtils/factories";
import { UserRole } from "@/types/contract";

const testFactory = {
  authState: define<AuthState>({
    userId: uuidSequence,
    email: (n: number) => `user${n}@test.com`,
    scope: (n: number) => `@user${n}`,
    isLoggedIn: true,
    isOnboarded: true,
    extension: true,
    organization(n: number) {
      const id = (1000 + n).toString();
      return {
        id,
        name: `Test Organization ${n}`,
        scope: `@organization-${n}`,
      };
    },
    organizations(n: number) {
      return [
        {
          id: uuidSequence(n),
          name: `Test Organization ${n}`,
          role: UserRole.developer,
          scope: `@organization-${n}`,
        },
        {
          id: uuidSequence(n * 100),
          name: `Test Admin Organization ${n * 100}`,
          role: UserRole.admin,
          scope: `@organization-${n * 100}`,
        },
        {
          id: uuidSequence(n * 100 + 1),
          name: `Test Member Organization ${n * 100 + 1}`,
          role: UserRole.member,
          scope: `@organization-${n * 100 + 1}`,
        },
        {
          id: uuidSequence(n * 100 + 2),
          name: `Test Restricted Organization ${n * 100 + 2}`,
          role: UserRole.restricted,
          scope: `@organization-${n * 100 + 2}`,
        },
        {
          id: uuidSequence(n * 100 + 3),
          name: `Test Manager Organization ${n * 100 + 3}`,
          role: UserRole.manager,
          scope: `@organization-${n * 100 + 3}`,
        },
      ];
    },
    groups() {
      const groups: AuthState["groups"] = [];
      return groups;
    },
    flags() {
      const flags: AuthState["flags"] = [];
      return flags;
    },
  }),
};

export default testFactory;
