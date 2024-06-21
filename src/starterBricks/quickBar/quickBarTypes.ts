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
import { type Manifest, type Menus } from "webextension-polyfill";

export type QuickBarTargetMode = "document" | "eventTarget";

export type QuickBarConfig = {
  /**
   * The title to show in the Quick Bar
   */
  title: string;

  /**
   * (Optional) the icon to show in the Quick Bar
   */
  icon?: IconConfig;

  action: BrickConfig | BrickPipeline;
};

export type QuickBarDefaultOptions = {
  title?: string;
  [key: string]: string | string[] | undefined;
};

export interface QuickBarDefinition extends StarterBrickDefinitionProp {
  documentUrlPatterns?: Manifest.MatchPattern[];
  contexts: Menus.ContextType[];
  targetMode: QuickBarTargetMode;
  defaultOptions?: QuickBarDefaultOptions;
}
