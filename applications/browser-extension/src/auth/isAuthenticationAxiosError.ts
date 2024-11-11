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

import type { AxiosError } from "axios";
import { isObject } from "@/utils/objectUtils";

const UNAUTHORIZED_STATUS_CODES = new Set([401, 403]);

export function isAuthenticationAxiosError(
  error: Pick<AxiosError, "response">,
): boolean {
  // Response should be an object
  if (!isObject(error.response)) {
    return false;
  }

  // Technically 403 is an authorization error and re-authenticating as the same user won't help. However, there is
  // a case where the user just needs an updated JWT that contains the most up-to-date entitlements
  if (UNAUTHORIZED_STATUS_CODES.has(error.response.status)) {
    return true;
  }

  // Handle Automation Anywhere's Control Room expired JWT response. They'll return this from any endpoint instead
  // of a proper error code.
  if (
    error.response.status === 400 &&
    isObject(error.response.data) &&
    error.response.data.message === "Access Token has expired"
  ) {
    return true;
  }

  return false;
}
