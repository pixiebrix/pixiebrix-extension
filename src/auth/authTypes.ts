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

import { RegistryId, UUID } from "@/core";
import { Except } from "type-fest";

export interface AuthOption {
  label: string;
  /** The UUID of the auth credential **/
  value: UUID;
  serviceId: RegistryId;
  local: boolean;
}

export interface UserData {
  email?: string;
  user?: string;
  hostname?: string;
  organizationId?: string;
  telemetryOrganizationId?: string;
}

export type UserDataUpdate = Required<Except<UserData, "hostname">>;

export const USER_DATA_UPDATE_KEYS: Array<keyof UserDataUpdate> = [
  "email",
  "user",
  "organizationId",
  "telemetryOrganizationId",
];

export interface AuthData extends UserData {
  token: string;
}

export interface BrowserAuthData extends AuthData {
  browserId: string;
}
