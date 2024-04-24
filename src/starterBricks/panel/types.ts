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
import { type StarterBrickDefinition } from "@/starterBricks/types";
import { type IconConfig } from "@/types/iconTypes";

export type PanelConfig = {
  heading?: string;
  body: BrickConfig | BrickPipeline;
  icon?: IconConfig;
  collapsible?: boolean;
  shadowDOM?: boolean;
};

type PanelPosition =
  | "append"
  | "prepend"
  | {
      // Element to insert the panel item before, selector is relative to the container
      sibling: string | null;
    };

interface PanelDefaultOptions {
  heading?: string;
  [key: string]: string | boolean | number;
}

export interface PanelDefinition extends StarterBrickDefinition {
  template: string;
  position?: PanelPosition;
  containerSelector: string;
  defaultOptions?: PanelDefaultOptions;
}
