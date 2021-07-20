/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { recordEvent, initUID } from "@/background/telemetry";
import { JsonObject } from "type-fest";

export function reportEvent(event: string, data: JsonObject = {}): void {
  console.debug(event);
  void recordEvent({ event, data }).catch((error: unknown) => {
    console.warn("Error reporting event %s", event, { error });
  });
}

export function initTelemetry(): void {
  void initUID().catch((error: unknown) => {
    console.warn("Error initializing uid", { error });
  });
}
