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

import { type TimedSequence, type UUID } from "@/types/stringTypes";
import { v4, validate } from "uuid";
import { INNER_SCOPE, type RegistryId } from "@/types/registryTypes";

export const PACKAGE_REGEX =
  /^((?<scope>@[\da-z~-][\d._a-z~-]*)\/)?((?<collection>[\da-z~-][\d._a-z~-]*)\/)?(?<name>[\da-z~-][\d._a-z~-]*)$/;

let sequence = 0;
/**
 * Returns a string that can be used to determine the order of two calls.
 * It guarantees the order of two calls from the same process, but it only helps
 * disambiguate calls from different processes if they are more than 1ms apart.
 */
export function getTimedSequence(): TimedSequence {
  sequence++;
  return validateTimedSequence(
    `${Date.now()}:${String(sequence).padStart(8, "0")}`,
  );
}

/** @internal */
export function validateTimedSequence(string: string): TimedSequence {
  // Timestamps between 2001 and 2287 have 13 digits. We're covered.
  if (!/^\d{13}:\d{8}$/.test(string)) {
    throw new TypeError("Invalid timed sequence: " + string);
  }

  return string as TimedSequence;
}

/**
 * Return a random v4 UUID.
 */
export function uuidv4(): UUID {
  // Use `uuid` package instead of `crypto.randomUUID()` because the latter isn't available on HTTP-non-S pages
  // https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID
  return v4() as UUID;
}

export function isUUID(uuid: string | undefined): uuid is UUID {
  if (uuid == null) {
    return false;
  }

  return validate(uuid);
}

/**
 * A sentinel UUID to serve as a default value/initial state for required UUID parameters.
 */
export const UNSET_UUID = validateUUID("00000000-0000-4000-A000-000000000000");

export function validateUUID(uuid: unknown): UUID {
  if (uuid == null) {
    return uuid as unknown as UUID;
  }

  if (typeof uuid !== "string") {
    throw new TypeError(
      `Expected UUID to be a string. Instead got: ${typeof uuid}`,
    );
  }

  if (isUUID(uuid)) {
    return uuid;
  }

  console.debug("Invalid UUID: %s", uuid);

  throw new Error("Invalid UUID", { cause: { uuid, type: typeof uuid } });
}

/**
 * Return true if id is a valid registry id
 */
export function isRegistryId(id: string): id is RegistryId {
  return id != null && PACKAGE_REGEX.test(id);
}

/**
 * Return true if `id` refers to an internal registry definition
 * @see makeInternalId
 */
export function isInnerDefinitionRegistryId(id: string): id is RegistryId {
  return id.startsWith(INNER_SCOPE + "/");
}

export function validateRegistryId(id: string | undefined): RegistryId {
  if (id == null) {
    // We don't have strictNullChecks on, so null values will find there way here. We should pass them along. Eventually
    // we can remove this check as strictNullChecks will check the call site
    return null as unknown as RegistryId;
  }

  if (isRegistryId(id)) {
    return id;
  }

  console.debug("Invalid registry id: %s", id);

  throw new Error("Invalid registry id");
}
