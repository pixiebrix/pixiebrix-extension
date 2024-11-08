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

import { StorageItem } from "webext-storage";
import { type AuthState } from "./authTypes";
import { type UUID } from "@/types/stringTypes";
import { type AuthData } from "../integrations/integrationTypes";

export const anonAuth: AuthState = Object.freeze({
  userId: undefined,
  email: undefined,
  isLoggedIn: false,
  isOnboarded: false,
  isTestAccount: false,
  extension: true,
  scope: null,
  milestones: [],
  organizations: [],
  groups: [],
  enforceUpdateMillis: null,
});

export type AuthStorage = Record<UUID, AuthData>;
export const oauth2Storage = new StorageItem("OAUTH2", {
  defaultValue: {} as AuthStorage,
});
