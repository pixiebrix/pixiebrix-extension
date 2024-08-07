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
import {
  type StarterBrickDefinitionProp,
  type CustomEventOptions,
  type DebounceOptions,
} from "@/starterBricks/types";
import { type ValueOf } from "type-fest";

export type SidebarConfig = {
  // Heading could be undefined because the page editor sets empty string values to undefined. See:
  // https://github.com/pixiebrix/pixiebrix-extension/blob/cf7a0567248ffb6c3172653786f2f3486019e394/src/pageEditor/starterBricks/base.ts#L377
  heading?: string;
  body: BrickConfig | BrickPipeline;
};

/**
 * Sidebar refresh triggers
 */
export const SidebarTriggers = {
  // Page load/navigation (default for backward compatability)
  LOAD: "load",
  // https://developer.mozilla.org/en-US/docs/Web/API/Document/selectionchange_event
  SELECTION_CHANGE: "selectionchange",
  // A change in the mod page state
  STATE_CHANGE: "statechange",
  // Manually, e.g., via the Page Editor or Show Sidebar brick
  MANUAL: "manual",
  // A custom event configured by the user
  CUSTOM: "custom",
} as const;

/**
 * Sidebar refresh triggers
 */
export type Trigger = ValueOf<typeof SidebarTriggers>;

export interface SidebarDefinition extends StarterBrickDefinitionProp {
  /**
   * The trigger to refresh the panel
   *
   * @since 1.6.5
   */
  trigger?: Trigger;

  /**
   * For `custom` trigger, the custom event trigger options.
   *
   * @since 1.6.5
   */
  customEvent?: CustomEventOptions;

  /**
   * Options for debouncing the overall refresh of the panel
   *
   * @since 1.6.5
   */
  debounce?: DebounceOptions;
}
