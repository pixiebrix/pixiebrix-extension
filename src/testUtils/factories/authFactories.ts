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

import { define, derive, extend } from "cooky-cutter";
import {
  type AuthState,
  type AuthUserOrganization,
  type OrganizationAuthState,
} from "@/auth/authTypes";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import { type Me, type Milestone, UserRole } from "@/types/contract";

/**
 * @see userOrganizationFactory
 */
export const organizationStateFactory = define<AuthUserOrganization>({
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

/**
 * @see userFactory
 */
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
      organizationStateFactory({
        role: UserRole.developer,
      }),
      organizationStateFactory({
        name(n: number): string {
          return `Test Admin Organization ${n}`;
        },
        role: UserRole.admin,
      }),
      organizationStateFactory({
        name(n: number): string {
          return `Test Member Organization ${n}`;
        },
        role: UserRole.member,
      }),
      organizationStateFactory({
        name(n: number): string {
          return `Test Restricted Organization ${n}`;
        },
        role: UserRole.restricted,
      }),
      organizationStateFactory({
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

export const userOrganizationFactory = define<Me["organization"]>({
  id: uuidSequence,
  name(n: number): string {
    return `Test Organization ${n}`;
  },
  scope(n: number): string {
    return `@organization-${n}`;
  },
  control_room: null,
  theme: null,
});
export const userFactory = define<Me>({
  id: uuidSequence,
  email: (n: number) => `user${n}@test.com`,
  scope: (n: number) => `@user${n}`,
  flags: () => [] as Me["flags"],
  is_onboarded: true,
  organization: null,
  telemetry_organization: null,
  organization_memberships: () => [] as Me["organization_memberships"],
  group_memberships: () => [] as Me["group_memberships"],
  milestones: () => [] as Me["milestones"],
});

export const partnerUserFactory = extend<Me, Me>(userFactory, {
  partner: {
    name: "Automation Anywhere",
    theme: "automation-anywhere",
  },
});
