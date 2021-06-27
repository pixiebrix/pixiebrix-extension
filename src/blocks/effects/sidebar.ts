/*
 * Copyright (C) 2021 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Effect } from "@/types";
import { registerBlock } from "@/blocks/registry";
import { Schema } from "@/core";
import { browser } from "webextension-polyfill-ts";
import {
  HIDE_ACTION_FRAME,
  SHOW_ACTION_FRAME,
} from "@/background/browserAction";

const noParams: Schema = {
  $schema: "https://json-schema.org/draft/2019-09/schema#",
  type: "object",
  properties: {},
};

export class ShowSidebar extends Effect {
  constructor() {
    super(
      "@pixiebrix/sidebar/show",
      "Show Sidebar",
      "Show/open the PixieBrix sidebar"
    );
  }

  inputSchema: Schema = noParams;

  async effect(): Promise<void> {
    await browser.runtime.sendMessage({
      type: SHOW_ACTION_FRAME,
    });
  }
}

export class HideSidebar extends Effect {
  constructor() {
    super(
      "@pixiebrix/sidebar/hide",
      "Hide Sidebar",
      "Hide/close the PixieBrix sidebar"
    );
  }

  inputSchema: Schema = noParams;

  async effect(): Promise<void> {
    await browser.runtime.sendMessage({
      type: HIDE_ACTION_FRAME,
    });
  }
}

registerBlock(new ShowSidebar());
registerBlock(new HideSidebar());
