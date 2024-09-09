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

import type {
  MergeStrategy,
  StateNamespace,
} from "@/platform/state/stateTypes";
import type { Except, JsonObject } from "type-fest";
import type { ModComponentRef } from "@/types/modComponentTypes";

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
   *
   * @since 2.1.2 asynchronous
   */
  getState(args: {
    namespace: StateNamespace;
    modComponentRef: Except<ModComponentRef, "starterBrickId">;
  }): Promise<JsonObject>;

  /**
   * Set the state for a given namespace.
   *
   * @since 2.1.2 asynchronous
   */
  setState(args: {
    namespace: StateNamespace;
    modComponentRef: Except<ModComponentRef, "starterBrickId">;
    data: JsonObject;
    mergeStrategy: MergeStrategy;
  }): Promise<JsonObject>;
};
