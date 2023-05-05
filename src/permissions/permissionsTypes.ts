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

import { type Permissions } from "webextension-polyfill";

// Named as PermissionsStatus to avoid conflict with native PermissionsState type
export type PermissionsStatus = {
  /**
   * True if PixieBrix already has all the required permissions.
   */
  hasPermissions: boolean;

  /**
   * Permissions computed for the blueprint and selected service configurations.
   */
  permissions: Permissions.Permissions;
};

/**
 * Return true if the value is a PermissionsStatus record
 * @param value the value to check
 */
export function isPermissionsStatus(
  value: unknown
): value is PermissionsStatus {
  return (
    typeof value === "object" &&
    value !== null &&
    "hasPermissions" in value &&
    "permissions" in value
  );
}
