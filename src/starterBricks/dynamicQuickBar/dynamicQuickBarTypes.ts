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
import { type Manifest } from "webextension-polyfill";

export type DynamicQuickBarConfig = {
  /**
   * A root action. If provided, produced actions will be nested under this action.
   */
  rootAction?: {
    /**
     * The title of the parent action to show in the Quick Bar
     */
    title: string;

    /**
     * (Optional) the icon to show in the Quick Bar
     */
    icon?: IconConfig;

    /**
     * (Optional) only generate actions if the root element is selected/active.
     */
    requireActiveRoot?: boolean;
  };

  /**
   * Action generator pipeline.
   */
  generator: BrickConfig | BrickPipeline;
};

export type DynamicQuickBarDefaultOptions = Record<string, string | string[]>;

export interface DynamicQuickBarDefinition extends StarterBrickDefinitionProp {
  documentUrlPatterns?: Manifest.MatchPattern[];
  defaultOptions?: DynamicQuickBarDefaultOptions;
}
