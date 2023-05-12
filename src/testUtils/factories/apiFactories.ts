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

import { define, extend } from "cooky-cutter";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import {
  type Database,
  type Me,
  type SanitizedAuth,
  type SanitizedAuthService,
} from "@/types/contract";
import { validateRegistryId } from "@/types/helpers";

// This file is for factories that driven by the backend API. Does not include factories where the shapes are primarily
// determined by the types from this project, e.g., IExtensions and RecipeDefinitions.

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

export const databaseFactory = define<Database>({
  id: uuidSequence,
  name: (n: number) => `Test Database ${n}`,
  created_at: () => new Date().toISOString(),
  last_write_at: () => new Date().toISOString(),
});

export const sanitizedAuthServiceFactory = define<SanitizedAuthService>({
  config: (n: number) => ({
    metadata: {
      id: validateRegistryId(`@test/service-${n}`),
      name: `Test Service ${n}`,
    },
  }),
  name: (n: number) => `Test Service ${n}`,
});
export const sanitizedAuthFactory = define<SanitizedAuth>({
  id: uuidSequence,
  organization: null,
  label: (n: number) => `Auth ${n}`,
  config: {
    _sanitizedConfigBrand: null,
  },
  service: sanitizedAuthServiceFactory,
});
