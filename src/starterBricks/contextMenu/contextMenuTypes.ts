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
import { type MessageConfig } from "@/utils/notify";
import { type Manifest, type Menus } from "webextension-polyfill";

export type ContextMenuConfig = {
  /**
   * The title of the context menu item.
   */
  title: string;

  /**
   * Action to perform on click.
   */
  action: BrickConfig | BrickPipeline;

  /**
   * (Experimental) message to show on success when running the extension
   * @since 1.7.27
   */
  onSuccess?: MessageConfig | boolean;
};

export type ContextMenuTargetMode =
  // In `legacy` mode, the target was passed to the readers but the document is passed to reducePipeline
  "legacy" | "document" | "eventTarget";

export interface MenuDefaultOptions {
  title?: string;
  [key: string]: string | string[] | undefined;
}

export interface ContextMenuDefinition extends StarterBrickDefinitionProp {
  documentUrlPatterns?: Manifest.MatchPattern[];
  contexts: Menus.ContextType[];
  targetMode: ContextMenuTargetMode;
  defaultOptions?: MenuDefaultOptions;
}
