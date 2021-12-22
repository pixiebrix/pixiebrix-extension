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

import { Transformer } from "@/types";
import { Schema } from "@/core";
import { captureTab } from "@/background/messenger/api";

export class CaptureTab extends Transformer {
  constructor() {
    super(
      "@pixiebrix/browser/capture-tab",
      "Capture Tab",
      "Capture the visible area of the current tab"
    );
  }

  inputSchema: Schema = {
    type: "object",
    properties: {},
  };

  async transform(): Promise<string> {
    return captureTab();
  }
}
