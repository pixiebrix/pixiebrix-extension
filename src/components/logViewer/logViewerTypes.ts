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

import { type LogEntry } from "@/telemetry/logging";
import { type MessageContext } from "@/core";

export type LogState = {
  /**
   * The selected context for Logs
   */
  activeContext: MessageContext | null;

  /**
   * All available log entries
   */
  availableEntries: LogEntry[];

  /**
   * Log entries that have been selected for viewing (without pagination and filtering)
   */
  entries: LogEntry[];

  /**
   * Indicates the progress of the first loading from storage for the active context
   */
  isLoading: boolean;
};

export type LogRootState = {
  logs: LogState;
};
