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

// See REST_FRAMEWORK["DEFAULT_VERSION"] in the Django settings
const DEFAULT_API_VERSION = "1.0";

// See REST_FRAMEWORK["ALLOWED_VERSIONS"] in the Django settings
const API_VERSIONS = [DEFAULT_API_VERSION, "1.1", "2.0"];
export type ApiVersion = (typeof API_VERSIONS)[number];

// Don't include the baseURL in the map keys because the base URL is baked into the axios instance,
// see setupApiClient(), so the URL we're matching against will always be relative.
// Also, the URL must be the full path string. We're not currently doing any regex or substring matching,
// see getURLApiVersion().
const API_VERSION_MAP = new Map<string, ApiVersion>([
  // @since 1.8.10 -- excludes the package config
  ["/api/deployments/", "1.1"],
  // @since 2.0.6 -- includes organization.is_enterprise and excludes telemetry_organization
  ["/api/me/", "1.1"],
]);

export function getURLApiVersion(url: string | undefined): string {
  if (!url) {
    return DEFAULT_API_VERSION;
  }

  return API_VERSION_MAP.get(url) || DEFAULT_API_VERSION;
}
