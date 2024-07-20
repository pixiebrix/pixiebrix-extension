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

import { validateRegistryId, validateUUID } from "@/types/helpers";
import { padStart } from "lodash";
import { nowTimestamp } from "@/utils/timeUtils";

let uuidIndex = 0;
let registryIndex = 0;

/**
 * UUID sequence generator that's predictable across runs. For use in cooky-cutter factories.
 *
 * A couple characters can't be 0 https://stackoverflow.com/a/19989922/402560
 * @param n the number of times the sequence has been called
 * @see autoUUIDSequence
 */
export const uuidSequence = (n: number) =>
  validateUUID(`${padStart(String(n), 8, "0")}-0000-4000-A000-000000000000`);

/**
 * UUID factory that uses a global sequence to generate predictable UUIDs.
 * @see uuidSequence
 */
export const autoUUIDSequence = () => uuidSequence(uuidIndex++);

/**
 * A package registry ID generator that's predictable across runs. For use in cooky-cutter factories.
 * @param n the number of times the sequence has been called
 */
export const registryIdSequence = (n: number) =>
  validateRegistryId(`test/package-${n}`);

/**
 * Registry ID factory that uses a global sequence to generate predictable registry IDs.
 * @see registryIdSequence
 */
export const registryIdFactory = () => registryIdSequence(registryIndex++);

/**
 * Test factory for ISO timestamps.
 *
 * In code, use `isoTimestamp` directly.
 *
 * @see nowTimestamp
 */
export const timestampFactory = () => nowTimestamp();
