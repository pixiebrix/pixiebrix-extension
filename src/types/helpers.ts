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

import { validate, v4 as uuidFactory } from "uuid";
import { RegistryId, SemVerString, Timestamp, UUID } from "@/core";
import { valid as semVerValid } from "semver";
import { startsWith } from "lodash";

export const PACKAGE_REGEX =
  /^((?<scope>@[\da-z~-][\d._a-z~-]*)\/)?((?<collection>[\da-z~-][\d._a-z~-]*)\/)?(?<name>[\da-z~-][\d._a-z~-]*)$/;

export function uuidv4(): UUID {
  return uuidFactory() as UUID;
}

export function isUUID(uuid: string): uuid is UUID {
  return validate(uuid);
}

export function validateUUID(uuid: string): UUID {
  if (uuid == null) {
    // We don't have strictNullChecks on, so null values will find there way here. We should pass them along. Eventually
    // we can remove this check as strictNullChecks will check the call site
    return uuid as UUID;
  }

  if (isUUID(uuid)) {
    return uuid;
  }

  console.debug("Invalid UUID: %s", uuid);

  throw new Error("Invalid UUID");
}

export function isRegistryId(id: string): id is RegistryId {
  return PACKAGE_REGEX.test(id);
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

export function isTimestamp(value: string): value is Timestamp {
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
  allowLeadingV = true
): value is SemVerString {
  if (semVerValid(value) != null) {
    return allowLeadingV || !startsWith(value, "v");
  }

  return false;
}
