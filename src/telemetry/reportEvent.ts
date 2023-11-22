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

import { backgroundTarget as bg, getNotifier } from "webext-messenger";
import { type Event } from "@/telemetry/events";
import { type JsonObject } from "type-fest";

// Private method. Do not move to api.ts
const _record = getNotifier("RECORD_EVENT", bg);

/**
 * Report an event to the PixieBrix telemetry service, if the user doesn't have DNT set.
 * @see selectEventData
 */
export default function reportEvent(event: Event, data: JsonObject = {}): void {
  // eslint-disable-next-line prefer-rest-params -- Needs `arguments` to avoid printing the default
  console.debug(...arguments);
  _record({ event, data });
}
