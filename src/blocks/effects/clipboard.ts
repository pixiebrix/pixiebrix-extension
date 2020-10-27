/*
 * Copyright (C) 2020 Pixie Brix, LLC
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
import copy from "copy-to-clipboard";
import { BlockArg, BlockOptions, Schema } from "@/core";

export class CopyToClipboard extends Effect {
  constructor() {
    super(
      "@pixiebrix/clipboard/copy",
      "Copy to clipboard",
      "Copy content to your clipboard"
    );
  }

  permissions = {
    permissions: ["clipboardWrite"],
  };

  inputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {
      text: {
        type: "string",
      },
    },
  };

  async effect({ text }: BlockArg, options: BlockOptions) {
    copy(text);
  }
}

registerBlock(new CopyToClipboard());
