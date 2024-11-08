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

import type { TraceEntryData, TraceExitData } from "../../telemetry/trace";
import type { UUID } from "../../types/stringTypes";

/**
 * The tracing protocol.
 * @since 1.8.10
 */
export interface TraceProtocol {
  enter: (data: TraceEntryData) => void;
  exit: (data: TraceExitData) => void;
}

/**
 * The trace/debugger protocol.
 * @since 1.8.10
 */
export interface DebuggerProtocol {
  /**
   * Clear debug/trace entries for the given component.
   *
   * Awaitable to allow the caller to ensure the entries are cleared before continuing.
   *
   * @param componentId the mod component id
   */
  clear: (
    componentId: UUID,
    { logValues }: { logValues: boolean },
  ) => Promise<void>;

  traces: TraceProtocol;
}
