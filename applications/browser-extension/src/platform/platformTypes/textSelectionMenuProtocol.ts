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

import type { Nullishable } from "../../utils/nullishUtils";
import type { IconConfig } from "../../types/iconTypes";
import type { UUID } from "../../types/stringTypes";

export type TextSelectionAction = {
  /**
   * The icon to display in the selection tooltip.
   * Currently, there's no way to set icons for context menu items, so icon will always be nullish
   */
  icon?: Nullishable<IconConfig>;
  /**
   * The user-visible title of the action.
   */
  title: string;
  /**
   * Text selection handler
   * @param text the selected text
   */
  handler: (text: string) => void;
};

/**
 * Protocol for a popover displayed when a user selects text
 * @since 1.8.10
 */
export interface TextSelectionMenuProtocol {
  /**
   * Register a text selection action
   * @param modComponentId the owner mod component
   * @param action the action definition
   */
  register(modComponentId: UUID, action: TextSelectionAction): void;

  /**
   * Unregister all text selection actions for a given mod component
   * @param modComponentId the owner mod component
   */
  unregister(modComponentId: UUID): void;
}
