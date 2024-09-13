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

import { validateUUID } from "@/types/helpers";
import { type Timestamp, type UUID } from "@/types/stringTypes";
import { type components } from "@/types/swagger";
import { type SetRequired } from "type-fest";

export type OrganizationMembershipUser = {
  userId: UUID;
  userName?: string;
  userEmail?: string;
  serviceAccount?: boolean;
  deploymentKeyAccount?: boolean;
  dateJoined?: Timestamp;
};

type Memberships = SetRequired<
  components["schemas"]["Organization"],
  "members"
>["members"];

export function transformOrganizationMemberUserResponse(
  user: Memberships[number]["user"],
): OrganizationMembershipUser {
  return {
    userId: validateUUID(user?.id),
    userName: user?.name,
    userEmail: user?.email,
    serviceAccount: user?.service_account,
    deploymentKeyAccount: user?.deployment_key_account,
    dateJoined: user?.date_joined,
  };
}
