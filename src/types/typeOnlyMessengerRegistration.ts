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

/**
 * @file This file provides Messenger to the strictNullChecks build.
 * It must not be imported.
 * The actual methods must be registered in the appropriate registration.ts file,
 * this is enforced by typescript itself as long as this file is never imported.
 * @see https://github.com/pixiebrix/pixiebrix-extension/issues/6526
 */

/* eslint-disable import/no-restricted-paths -- Type-only file. Remove each import once they end up in th strictNullChecks list */

import {
  type hideSidebar,
  type showSidebar,
} from "@/contentScript/sidebarController";
import { type SerializedError } from "@/types/messengerTypes";
import { type MessageContext } from "@/types/loggerTypes";
import { type JsonObject } from "type-fest";
import { type Event } from "@/telemetry/events";
import { type showMySidePanel } from "@/background/sidePanel";

declare global {
  interface MessengerMethods {
    SHOW_SIDEBAR: typeof showSidebar;
    HIDE_SIDEBAR: typeof hideSidebar;
    SHOW_MY_SIDE_PANEL: typeof showMySidePanel;

    // Temporary duplicate type for a background method used by the sidebar.
    // NOTE: Changes to those functions must be reflected here.
    RECORD_ERROR: (
      serializedError: SerializedError,
      context: MessageContext,
      data?: JsonObject,
    ) => Promise<void>;

    RECORD_EVENT: (event: {
      event: Event;
      data: JsonObject | undefined;
    }) => Promise<void>;
  }
}
