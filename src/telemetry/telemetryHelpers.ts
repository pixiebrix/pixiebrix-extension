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

import type { UserData } from "@/auth/authTypes";
import { uuidv4 } from "@/types/helpers";
import type { UUID } from "@/types/stringTypes";
import { once } from "lodash";
import { StorageItem } from "webext-storage";
import type { ModComponentRef } from "@/types/modComponentTypes";
import type { MessageContext } from "@/types/loggerTypes";

/**
 * The Person model for application error telemetry.
 */
export type TelemetryUser = {
  /**
   * User id or browser distinct id, if the user is anonymous.
   */
  id: UUID;
  email?: string;
  organizationId?: UUID | null;
};

export const uuidStorage = new StorageItem<UUID>("USER_UUID");

/**
 * Return a random ID for this browser profile.
 * It's persisted in storage via `chrome.storage.local` and in-memory via `once`
 *
 * In React code, use useBrowserIdentifier
 *
 * @see useBrowserIdentifier
 */
export const getUUID = once(async (): Promise<UUID> => {
  const existingUUID = await uuidStorage.get();
  if (existingUUID) {
    return existingUUID;
  }

  const newUUID = uuidv4();
  console.debug("Generating UID for browser", { uuid: newUUID });
  await uuidStorage.set(newUUID);
  return newUUID;
});

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
  data: UserData,
): Promise<TelemetryUser> {
  const browserId = await getUUID();
  const { user, email, telemetryOrganizationId, organizationId } = data;

  return {
    id: user ?? browserId,
    email,
    organizationId: telemetryOrganizationId ?? organizationId,
  };
}

/**
 * Returns the event data for a ModComponentRef.
 * @see selectEventData
 */
export function mapModComponentRefToEventData(
  modComponentRef: ModComponentRef,
): MessageContext {
  // Fields are currently named the same. In the future, the fields might temporarily diverge.
  return {
    extensionId: modComponentRef.extensionId,
    extensionPointId: modComponentRef.extensionPointId,
    // MessageContext expects undefined instead of null/undefined
    blueprintId: modComponentRef.blueprintId ?? undefined,
  };
}
