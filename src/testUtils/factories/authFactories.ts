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

import { define, derive } from "cooky-cutter";
import {
  type AuthState,
  type AuthUserOrganization,
  type OrganizationAuthState,
} from "@/auth/authTypes";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import { type Milestone, UserRole } from "@/types/contract";

export const organizationFactory = define<AuthUserOrganization>({
  id: uuidSequence,
  name(n: number): string {
    return `Test Organization ${n}`;
  },
  role: UserRole.developer,
  scope(n: number): string {
    return `@organization-${n}`;
  },
  isDeploymentManager: false,
  hasComplianceAuthToken: false,
});
export const authStateFactory = define<AuthState>({
  userId: uuidSequence,
  email: (n: number) => `user${n}@test.com`,
  scope: (n: number) => `@user${n}`,
  isLoggedIn: true,
  isOnboarded: true,
  isTestAccount: false,
  extension: true,
  enforceUpdateMillis: null,
  organizations() {
    return [
      organizationFactory({
        role: UserRole.developer,
      }),
      organizationFactory({
        name(n: number): string {
          return `Test Admin Organization ${n}`;
        },
        role: UserRole.admin,
      }),
      organizationFactory({
        name(n: number): string {
          return `Test Member Organization ${n}`;
        },
        role: UserRole.member,
      }),
      organizationFactory({
        name(n: number): string {
          return `Test Restricted Organization ${n}`;
        },
        role: UserRole.restricted,
      }),
      organizationFactory({
        name(n: number): string {
          return `Test Manager Organization ${n}`;
        },
        role: UserRole.manager,
      }),
    ];
  },
  organization: derive<AuthState, OrganizationAuthState>(
    ({ organizations }) => organizations[0],
    "organizations"
  ),
  groups() {
    const groups: AuthState["groups"] = [];
    return groups;
  },
  flags() {
    const flags: AuthState["flags"] = [];
    return flags;
  },
  milestones(): Milestone[] {
    return [];
  },
});
