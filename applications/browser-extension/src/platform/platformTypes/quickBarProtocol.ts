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

import type { Action } from "kbar";
import { type ModComponentRef } from "../../types/modComponentTypes";

/**
 * `kbar` action with additional metadata about the source of the action.
 */
export type CustomAction = Action & {
  /**
   * The mod component that registered the action, if any.
   */
  modComponentRef?: ModComponentRef;
};

/**
 * Public interface for the Quick Bar registry.
 * @since 1.8.10
 */
export interface QuickBarProtocol {
  /**
   * Register a custom action with the Quick Bar.
   */
  addAction(action: CustomAction): void;

  // XXX: this will likely be refactored in the future.
  knownGeneratorRootIds: Set<string>;
}
