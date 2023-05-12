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

import { type Timestamp } from "@/types/stringTypes";
import { uuidv4, validateRegistryId, validateUUID } from "@/types/helpers";
import { padStart } from "lodash";

/**
 * UUID sequence generator that's predictable across runs.
 *
 * A couple characters can't be 0 https://stackoverflow.com/a/19989922/402560
 * @param n
 */
export const uuidSequence = (n: number) =>
  validateUUID(`${padStart(String(n), 8, "0")}-0000-4000-A000-000000000000`);

export const registryIdFactory = () => validateRegistryId(`test/${uuidv4()}`);

export const timestampFactory = () => new Date().toISOString() as Timestamp;
