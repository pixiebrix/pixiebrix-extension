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

import { recordEvent } from "@/background/messenger/api";
import { JsonObject } from "type-fest";

/**
 * Report an event to the PixieBrix telemetry service, if the user doesn't have DNT set.
 * @see selectEventData
 */
export function reportEvent(event: string, data: JsonObject = {}): void {
  console.debug(event, data);
  recordEvent({ event, data });
}
