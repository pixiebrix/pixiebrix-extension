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

import { type BrickConfig, type BrickPipeline } from "@/bricks/types";
import { type IconConfig } from "@/types/iconTypes";
import { type MessageConfig } from "@/utils/notify";

export type MenuItemStarterBrickConfig = {
  /**
   * The button caption to supply to the `caption` in the extension point template.
   * If `dynamicCaption` is true, can include template expressions.
   */
  caption: string;

  /**
   * (Optional) the icon to supply to the icon in the extension point template
   */
  icon?: IconConfig;

  /**
   * The action to perform when the button is clicked
   */
  action: BrickConfig | BrickPipeline;

  /**
   * (Experimental) condition to determine whether to show the menu item
   * @see if
   */
  if?: BrickConfig | BrickPipeline;

  /**
   * True if caption is determined dynamically (using the reader and templating)
   */
  dynamicCaption?: boolean;

  /**
   * True to prevent button to be clicked again while action is in progress
   */
  synchronous: boolean;

  /**
   * (Experimental) message to show on error running the extension
   */
  onError?: MessageConfig;
  /**
   * (Experimental) message to show if the user cancelled the action (e.g., cancelled a form, or the Cancel brick ran)
   */
  onCancel?: MessageConfig;
  /**
   * (Experimental) message to show on success when running the extension
   */
  onSuccess?: MessageConfig | boolean;
};

export type MenuPosition =
  | "append"
  | "prepend"
  | {
      // Element to insert the menu item before, selector is relative to the container
      sibling: string | null;
    };
