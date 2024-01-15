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

import type { UserData } from "@/auth/authTypes";
import { getUID } from "@/background/messenger/api";
import type { UUID } from "@/types/stringTypes";

/**
 * The Person model for application error telemetry.
 */
type TelemetryUser = {
  /**
   * User id or browser distinct id, if the user is anonymous.
   */
  id: UUID;
  email?: string;
  organizationId?: UUID;
};

/**
 * Cleans up the version name for Datadog.
 *
 * Operations:
 * - Strip timestamp from local builds (To avoid proliferation of tag values)
 *
 * See https://docs.datadoghq.com/getting_started/tagging/#overview
 *
 * @example
 *   Input: "1.8.8-alpha.1-local+2024-01-14T18:13:07.744Z"
 *   Output: "1.8.8-alpha.1-local"
 *
 * @param versionName the Chrome browser extension version name
 */
export function cleanDatadogVersionName(versionName: string): string {
  return (
    versionName
      // Remove timestamps from local builds
      .replace(/local\+.*$/, "local")
      // Replace invalid characters with underscores
      .replaceAll("+", "_")
      // Convert to lowercase
      .toLowerCase()
  );
}

/**
 * Returns user data to include in Datadog error telemetry.
 * @param data the PixieBrix user data
 */
export async function mapAppUserToTelemetryUser(
  data: Partial<UserData>,
): Promise<TelemetryUser> {
  const browserId = await getUID();
  const { user, email, telemetryOrganizationId, organizationId } = data;

  return {
    id: user ?? browserId,
    email,
    organizationId: telemetryOrganizationId ?? organizationId,
  };
}
