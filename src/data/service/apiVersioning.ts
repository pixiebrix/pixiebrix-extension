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

// See similar file in the App codebase

// See REST_FRAMEWORK["ALLOWED_VERSIONS"] in the Django settings
const API_VERSIONS = ["1.0", "1.1", "2.0"] as const;
export type ApiVersion = (typeof API_VERSIONS)[number];

// See REST_FRAMEWORK["DEFAULT_VERSION"] in the Django settings
const DEFAULT_API_VERSION = "1.0";

export function getRequestHeadersByAPIVersion(
  apiVersion: ApiVersion | undefined,
) {
  if (!apiVersion || apiVersion === DEFAULT_API_VERSION) {
    // No headers are required for the default version.
    // But we set as a default axios header in baseQuery.ts anyway.
    return {};
  }

  const nonDefaultApiVersions = API_VERSIONS.filter(
    (version) => version !== DEFAULT_API_VERSION,
  );

  if (nonDefaultApiVersions.includes(apiVersion)) {
    return { Accept: `application/json; version=${apiVersion}` };
  }

  throw new Error("Unknown API version");
}
