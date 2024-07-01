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

import { backgroundTarget as bg, getNotifier } from "webext-messenger";
import { type Event, type ReservedKeys } from "@/telemetry/events";
import { expectContext } from "@/utils/expectContext";

expectContext(
  "extension",
  "reportEvent requires access to the background messenger API",
);

// Private method. Do not move to api.ts
const _record = getNotifier("RECORD_EVENT", bg);

function transformEventData(data: UnknownObject): UnknownObject {
  if (data.brickId) {
    data.blockId = data.brickId;
  }

  if (data.brickVersion) {
    data.blockVersion = data.brickVersion;
  }

  if (data.integrationId) {
    data.serviceId = data.integrationId;
  }

  if (data.integrationVersion) {
    data.serviceVersion = data.integrationVersion;
  }

  if (data.modId) {
    data.blueprintId = data.modId;
    data.recipeId = data.modId;
  }

  if (data.modVersion) {
    data.blueprintVersion = data.modVersion;
  }

  if (data.modComponentId) {
    data.extensionId = data.modComponentId;
  }

  if (data.modComponentLabel) {
    data.extensionLabel = data.modComponentLabel;
  }

  if (data.modComponents) {
    data.extensions = data.modComponents;
  }

  if (data.starterBrickId) {
    data.extensionPointId = data.starterBrickId;
  }

  return data;
}

/**
 * Report an event to the PixieBrix telemetry service, if the user doesn't have DNT set.
 * @see selectEventData
 */
export default function reportEvent<TData extends UnknownObject>(
  event: Event,
  data: TData extends ReservedKeys ? never : TData = {} as never,
): void {
  // eslint-disable-next-line prefer-rest-params -- Needs `arguments` to avoid printing the default
  console.debug(...arguments);
  _record({ event, data: transformEventData(data) });
}
