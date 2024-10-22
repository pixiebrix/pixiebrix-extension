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

import { formatDistanceToNowStrict } from "date-fns";
import { type Timestamp } from "@/types/stringTypes";

/**
 * Returns the current time in ISO format.
 *
 * In test files, use `timestampFactory` instead.
 *
 * @since 2.0.6
 * @see timestampFactory
 */
export function nowTimestamp(): Timestamp {
  return new Date().toISOString() as Timestamp;
}

function isTimestamp(value: string): value is Timestamp {
  try {
    return !Number.isNaN(Date.parse(value));
  } catch {
    return false;
  }
}

/** @knip test and factory helper */
export function validateTimestamp(value: string): Timestamp {
  if (isTimestamp(value)) {
    return value;
  }

  console.debug("Invalid timestamp %s", value);

  throw new TypeError("Invalid timestamp");
}

export function timeSince(dateIso: string): string {
  return formatDistanceToNowStrict(new Date(dateIso), {
    addSuffix: true /* "ago" */,
  });
}

export const sleep = async (milliseconds?: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
