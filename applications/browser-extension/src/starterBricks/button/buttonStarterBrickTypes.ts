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
import { type StarterBrickDefinitionProp } from "@/starterBricks/types";
import { type IconConfig } from "@/types/iconTypes";
import { type MessageConfig } from "@/utils/notify";
import { type StarterBrickTypes } from "@/types/starterBrickTypes";

/**
 * @since 1.7.8
 */
export type AttachMode =
  // Add buttons once. If a button is removed, PixieBrix will still attempt to re-add it.
  | "once"
  // Watch for new button containers (e.g., menus, toolbars) on the screen and add buttons to them
  | "watch";

export type ButtonStarterBrickConfig = {
  /**
   * The button caption to supply to the `caption` in the starter brick template.
   * If `dynamicCaption` is true, can include template expressions.
   */
  caption: string;

  /**
   * (Optional) the icon to supply to the icon in the starter brick template
   */
  icon?: IconConfig;

  /**
   * The action to perform when the button is clicked
   */
  action: BrickConfig | BrickPipeline;

  /**
   * (Experimental) condition to determine whether to show the button
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
   * (Experimental) message to show on error running the component
   */
  onError?: MessageConfig;
  /**
   * (Experimental) message to show if the user cancelled the action (e.g., cancelled a form, or the Cancel brick ran)
   */
  onCancel?: MessageConfig;
  /**
   * (Experimental) message to show on success when running the mod component
   */
  onSuccess?: MessageConfig | boolean;
};

export type ButtonPosition =
  | "append"
  | "prepend"
  | {
      // Element to insert the button before, selector is relative to the button's container
      sibling: string | null;
    };

export type ButtonTargetMode = "document" | "eventTarget";

interface ShadowDOM {
  mode?: "open" | "closed";
  tag?: string;
}

interface ButtonDefaultOptions {
  caption?: string;
  [key: string]: string | undefined;
}

/**
 * @since 1.7.16
 */
export interface ButtonDefinition extends StarterBrickDefinitionProp {
  // Using `menuItem` as the type for backward compatibility
  type: typeof StarterBrickTypes.BUTTON;
  /**
   * The HTML template to render the button.
   */
  template: string;
  /**
   * Position in the parent container to insert the button. Typically, a menu or toolbar.
   */
  position?: ButtonPosition;
  /**
   * Selector targeting the parent container location
   */
  containerSelector: string;
  /**
   * Selector passed to `.parents()` to determine the reader context. Must match exactly one element.
   * See https://api.jquery.com/parents/
   * @deprecated use targetMode and the Traverse Elements brick instead
   */
  readerSelector?: string;
  /**
   * The element to pass as the root to the readers and mod component (default="document")
   * @since 1.7.16
   * @see readerSelector
   */
  targetMode?: ButtonTargetMode;
  /**
   * Wrap button in a shadow DOM
   * @deprecated do we still want to support this? Is it used anywhere?
   */
  shadowDOM?: ShadowDOM;
  /**
   * Default options for ModComponentBases attached to the starter brick
   */
  defaultOptions?: ButtonDefaultOptions;
  /**
   * Mode for attaching the menu to the page. Defaults to "once"
   * @since 1.7.28
   */
  attachMode?: AttachMode;
}
