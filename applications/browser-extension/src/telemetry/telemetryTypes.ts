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

import { type Events } from "@/telemetry/events";
import { type UUID } from "@/types/stringTypes";

/**
 * The Person model for application error telemetry.
 */
export type TelemetryUser = {
  /**
   * User id or browser distinct id, if the user is anonymous.
   */
  id: UUID;
  email?: string;
  organizationId?: UUID | null;
};

export type TelemetryEvent = (typeof Events)[keyof typeof Events];

const RESERVED_KEYS = [
  "blockId",
  "blockVersion",
  "blueprintId",
  "blueprintVersion",
  "extensionId",
  "extensionLabel",
  "extensionPointId",
  "extensions",
  "recipeId",
  "recipeToActivate",
  "serviceId",
  "serviceVersion",
] as const;

type BanReservedKeys = {
  [K in (typeof RESERVED_KEYS)[number]]?: never;
};

export type ReportEventData = UnknownObject & BanReservedKeys;
