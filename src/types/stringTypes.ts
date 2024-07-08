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

import { type Tagged } from "type-fest";

export const VALID_UUID_REGEX =
  /^[\dA-Fa-f]{8}-[\dA-Fa-f]{4}-[1-5][\dA-Fa-f]{3}-[89ABab][\dA-Fa-f]{3}-[\dA-Fa-f]{12}$/;

/**
 * A known UUID v4 string
 * @see uuidv4
 * @see isUUID
 */
export type UUID = Tagged<string, "UUID">;

/**
 * An ISO timestamp string
 */
export type Timestamp = Tagged<string, "Timestamp">;

/**
 * Base64 encoded JSON string
 */
export type EncodedJSON = Tagged<string, "EncodedJSON">;

/**
 * A UTC timestamp followed by a sequence number valid in the current context.
 * Useful to determine order of two calls to getTimedSequence.
 */
export type TimedSequence = Tagged<string, "TimeSequence">;

/**
 * A string known not to be tainted with user-generated input.
 */
export type SafeString = Tagged<string, "SafeString">;

/**
 * Rendered HTML that has been sanitized.
 * @see sanitize
 */
export type SafeHTML = Tagged<string, "SafeHTML">;
