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

import { define, derive, extend } from "cooky-cutter";
import {
  type AuthState,
  type AuthUserOrganization,
  type DeploymentKey,
  type OrganizationAuthState,
  type PartnerAuthData,
  type TokenAuthData,
  type UserData,
} from "@/auth/authTypes";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import { type AuthData } from "@/integrations/integrationTypes";
import { type UserMilestone } from "@/data/model/UserMilestone";
import type { components } from "@/types/swagger";
import { type UserPartner } from "@/data/model/UserPartner";
import {
  type RequiredMeOrganizationResponse,
  type RequiredMePartnerResponse,
} from "@/data/service/responseTypeHelpers";
import { type SetRequired } from "type-fest";
import { padStart } from "lodash";
import { UserRole } from "@/data/model/Organization";

function emailFactory(n: number): string {
  return `user${n}@test.com`;
}

/**
 * @see meOrganizationApiResponseFactory
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
});

/**
 * @see meApiResponseFactory
 */
export const authStateFactory = define<AuthState>({
  userId: uuidSequence,
  email: emailFactory,
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
    ({ organizations }) => ({ ...organizations![0]!, isEnterprise: false }),
    "organizations",
  ),
  groups() {
    const groups: AuthState["groups"] = [];
    return groups;
  },
  milestones(): UserMilestone[] {
    return [];
  },
});

export const meOrganizationApiResponseFactory =
  define<RequiredMeOrganizationResponse>({
    id: uuidSequence,
    name(n: number): string {
      return `Test Organization ${n}`;
    },
    scope(n: number): string {
      return `@organization-${n}`;
    },
    control_room: undefined,
    theme: undefined,
  });

export const meApiResponseFactory = define<components["schemas"]["Me"]>({
  id: uuidSequence,
  email: emailFactory,
  scope: (n: number) => `@user${n}`,
  flags: (): components["schemas"]["Me"]["flags"] => [],
  is_onboarded: true,
  organization: undefined,
  organization_memberships:
    (): components["schemas"]["Me"]["organization_memberships"] => [],
  group_memberships: (): components["schemas"]["Me"]["group_memberships"] => [],
  milestones: (): components["schemas"]["Me"]["milestones"] => [],
});

export const meWithPartnerApiResponseFactory = extend<
  components["schemas"]["Me"],
  SetRequired<components["schemas"]["Me"], "partner">
>(meApiResponseFactory, {
  partner(n: number): RequiredMePartnerResponse {
    return {
      id: uuidSequence(n),
      name: "Automation Anywhere",
      theme: "automation-anywhere",
    };
  },
});

export const authDataFactory = define<AuthData>({
  _oauthBrand: null,
  username: "test_user",
  password: "test_pwd",
});

export const tokenAuthDataFactory = define<TokenAuthData>({
  email: emailFactory,
  user: uuidSequence,
  hostname: "app.pixiebrix.com",
  organizations(): UserData["organizations"] {
    return [];
  },
  groups(): UserData["groups"] {
    return [];
  },
  enforceUpdateMillis: null,
  partner: null,
  token: "1234567890abcdef",
});

export const userPartnerFactory = define<UserPartner>({
  partnerId: uuidSequence,
  partnerName(n: number): string {
    return `Test AA Partner ${n}`;
  },
  partnerTheme: "automation-anywhere",
});

export const partnerAuthDataFactory = define<PartnerAuthData>({
  authId: uuidSequence,
  token: "test_token",
  refreshToken: null,
  extraHeaders: null,
  refreshUrl: null,
  refreshParamPayload: null,
  refreshExtraHeaders: null,
});

let keyCounter = 0;

/**
 * Generate a deployment key for testing.
 * @since 2.0.6
 */
export function deploymentKeyFactory(): DeploymentKey {
  const value = padStart(keyCounter.toString(), 64, "0");
  keyCounter++;
  return value as DeploymentKey;
}

/**
 * Generate a native PixieBrix user token for testing.
 * @since 2.0.6
 */
export function userTokenFactory(): string {
  // Share counter with deploymentKeyFactory to avoid collisions
  const value = padStart(keyCounter.toString(), 64, "0");
  keyCounter++;
  return value;
}
