/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { Effect } from "@/types";
import { Schema } from "@/core";
import { browser } from "webextension-polyfill-ts";
import {
  HIDE_ACTION_FRAME,
  SHOW_ACTION_FRAME,
} from "@/background/browserAction";

const NO_PARAMS: Schema = {
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

  inputSchema: Schema = NO_PARAMS;

  async effect(): Promise<void> {
    console.debug("show sidebar");
    await browser.runtime.sendMessage({
      type: SHOW_ACTION_FRAME,
      payload: {},
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

  inputSchema: Schema = NO_PARAMS;

  async effect(): Promise<void> {
    await browser.runtime.sendMessage({
      type: HIDE_ACTION_FRAME,
      payload: {},
    });
  }
}
