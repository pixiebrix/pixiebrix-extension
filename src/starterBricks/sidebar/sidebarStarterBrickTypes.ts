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

export type SidebarConfig = {
  heading: string;
  body: BrickConfig | BrickPipeline;
};

export type Trigger =
  // `load` is page load/navigation (default for backward compatability)
  | "load"
  // https://developer.mozilla.org/en-US/docs/Web/API/Document/selectionchange_event
  | "selectionchange"
  // A change in the shared page state
  | "statechange"
  // Manually, e.g., via the Page Editor or Show Sidebar brick
  | "manual"
  // A custom event configured by the user
  | "custom";

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
