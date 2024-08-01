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
import { type TelemetryUser } from "@/telemetry/telemetryTypes";
import { uuidv4 } from "@/types/helpers";
import type { UUID } from "@/types/stringTypes";
import { cloneDeep, once } from "lodash";
import { StorageItem } from "webext-storage";

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

export function mapEventDataToDeprecatedTerminology(
  data: UnknownObject,
): UnknownObject {
  const _data = cloneDeep(data);
  if (_data.brickId) {
    _data.blockId = _data.brickId;
  }

  if (_data.brickVersion) {
    _data.blockVersion = _data.brickVersion;
  }

  if (_data.integrationId) {
    _data.serviceId = _data.integrationId;
  }

  if (_data.integrationVersion) {
    _data.serviceVersion = _data.integrationVersion;
  }

  if (_data.modId) {
    _data.blueprintId = _data.modId;
    _data.recipeId = _data.modId;
  }

  if (_data.modComponentId) {
    _data.extensionId = _data.modComponentId;
  }

  if (_data.modComponentLabel) {
    _data.extensionLabel = _data.modComponentLabel;
  }

  if (_data.modComponents) {
    _data.extensions = _data.modComponents;
  }

  if (_data.modToActivate) {
    _data.recipeToActivate = _data.modToActivate;
  }

  if (_data.modVersion) {
    _data.blueprintVersion = _data.modVersion;
  }

  if (_data.starterBrickId) {
    _data.extensionPointId = _data.starterBrickId;
  }

  return _data;
}
