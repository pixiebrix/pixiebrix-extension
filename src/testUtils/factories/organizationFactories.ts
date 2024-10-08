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

import { LegacyUserRole } from "@/data/model/UserRole";
import { uuidv4 } from "@/types/helpers";
import { type components } from "@/types/swagger";
import { define } from "cooky-cutter";

export const organizationResponseFactory = define<
  components["schemas"]["Organization"]
>({
  id: () => uuidv4(),
  name: (n: number) => `Test Organization ${n}`,
  scope: (n: number) => `@organization-${n}`,
  members: [
    {
      user: {
        name: "Admin User",
        email: "admin@example.com",
      },
      role: LegacyUserRole.admin,
      groups: [],
    },
    {
      user: {
        name: "Manager User",
        email: "manager@example.com",
      },
      role: LegacyUserRole.manager,
      groups: [],
    },
    {
      user: {
        name: "Member User",
        email: "member@example.com",
      },
      role: LegacyUserRole.member,
      groups: [],
    },
    {
      user: {
        name: "Developer User",
        email: "developer@example.com",
      },
      role: LegacyUserRole.developer,
      groups: [],
    },
    {
      user: {
        name: "Restricted User",
        email: "restricted@example.com",
      },
      role: LegacyUserRole.developer,
      groups: [],
    },
  ],
  trial_end_timestamp: undefined,
});
