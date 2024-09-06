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

import type { getState, setState } from "@/platform/state/stateController";

/**
 * The variable store/state for the platform.
 *
 * Formerly known as the "page state".
 *
 * @since 1.8.10
 */
export type StateProtocol = {
  /**
   * Get the current state.
   */
  getState: typeof getState;

  /**
   * Set the current state.
   */
  setState: typeof setState;

  /**
   * Register a callback to be called when a mod variable changes.
   * @param callback the callback to be called when a mod variable changes
   * @param options options for the callback
   * @since 2.1.2
   */
  addModVariableChangeListener(
    callback: () => void,
    options: { signal: AbortSignal },
  ): void;
};
