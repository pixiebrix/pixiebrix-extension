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

import type { UUID } from "@/types/stringTypes";
import type { Menus } from "webextension-polyfill";

export type SelectionMenuOptions = {
  modComponentId: UUID;
  title: string;
  contexts: Menus.ContextType[];
  documentUrlPatterns: string[];
};
type ContextMenuHandler = (args: Menus.OnClickData) => Promise<void>;

/**
 * Protocol for context menus.
 * @since 1.8.10
 */
export type ContextMenuProtocol = {
  /**
   * Register a context menu item. In browsers, there's a single context menu per mod component.
   */
  register: (
    arg: SelectionMenuOptions & { handler: ContextMenuHandler },
  ) => Promise<void>;

  /**
   * Unregister all content menu items owner by a mod component
   * @param componentId the mod component
   */
  unregister: (modComponentId: UUID) => Promise<void>;
};
