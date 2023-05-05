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

import { valid as semVerValid } from "semver";
import { startsWith } from "lodash";
import validUuidRegex from "@/vendors/validateUuid";
import { type Timestamp, type UUID } from "@/types/stringTypes";
import { type RegistryId, type SemVerString } from "@/types/registryTypes";

export const PACKAGE_REGEX =
  /^((?<scope>@[\da-z~-][\d._a-z~-]*)\/)?((?<collection>[\da-z~-][\d._a-z~-]*)\/)?(?<name>[\da-z~-][\d._a-z~-]*)$/;

export function uuidv4(): UUID {
  return crypto.randomUUID() as UUID;
}

export function isUUID(uuid: string): uuid is UUID {
  return validUuidRegex.test(uuid);
}

// Sentinel UUID
export const UNSET_UUID = validateUUID("00000000-0000-4000-A000-000000000000");

export function validateUUID(uuid: unknown): UUID {
  if (uuid == null) {
    // We don't have strictNullChecks on, so null values will find there way here. We should pass them along. Eventually
    // we can remove this check as strictNullChecks will check the call site
    return uuid as UUID;
  }

  if (typeof uuid !== "string") {
    throw new TypeError("Expected UUID to be a string");
  }

  if (isUUID(uuid)) {
    return uuid;
  }

  console.debug("Invalid UUID: %s", uuid);

  throw new Error("Invalid UUID");
}

export function isRegistryId(id: string): id is RegistryId {
  return id != null && PACKAGE_REGEX.test(id);
}

export function validateRegistryId(id: string): RegistryId {
  if (id == null) {
    // We don't have strictNullChecks on, so null values will find there way here. We should pass them along. Eventually
    // we can remove this check as strictNullChecks will check the call site
    return id as RegistryId;
  }

  if (isRegistryId(id)) {
    return id;
  }

  console.debug("Invalid registry id: %s", id);

  throw new Error("Invalid registry id");
}

function isTimestamp(value: string): value is Timestamp {
  try {
    return !Number.isNaN(Date.parse(value));
  } catch {
    return false;
  }
}

export function validateTimestamp(value: string): Timestamp {
  if (value == null) {
    // We don't have strictNullChecks on, so null values will find there way here. We should pass them along. Eventually
    // we can remove this check as strictNullChecks will check the call site
    return value as Timestamp;
  }

  if (isTimestamp(value)) {
    return value;
  }

  console.debug("Invalid timestamp %s", value);

  throw new TypeError("Invalid timestamp");
}

export function validateSemVerString(
  value: string,
  // Default to `false` to be stricter.
  { allowLeadingV = false }: { allowLeadingV?: boolean } = {}
): SemVerString {
  if (value == null) {
    // We don't have strictNullChecks on, so null values will find there way here. We should pass them along. Eventually
    // we can remove this check as strictNullChecks will check the call site
    return value as SemVerString;
  }

  if (testIsSemVerString(value, { allowLeadingV })) {
    return value;
  }

  console.debug("Invalid semver %s", value);

  throw new TypeError("Invalid semantic version");
}

export function testIsSemVerString(
  value: string,
  // FIXME: the SemVerString type wasn't intended to support a leading `v`. See documentation
  // Default to `false` to be stricter.
  { allowLeadingV = false }: { allowLeadingV?: boolean } = {}
): value is SemVerString {
  if (semVerValid(value) != null) {
    return allowLeadingV || !startsWith(value, "v");
  }

  return false;
}
