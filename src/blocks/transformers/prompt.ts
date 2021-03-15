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

import { Transformer } from "@/types";
import { registerBlock } from "@/blocks/registry";
import { BlockArg, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";

export class Prompt extends Transformer {
  constructor() {
    super(
      "@pixiebrix/prompt",
      "Prompt for input",
      "Show a browser prompt for a single input",
      "faCode"
    );
  }

  inputSchema: Schema = propertiesToSchema(
    {
      message: {
        type: "string",
        description: "A string of text to display to the user.",
      },
      defaultValue: {
        type: "string",
        description:
          "A string containing the default value displayed in the text input field",
      },
    },
    ["message"]
  );

  async transform({ message, defaultValue }: BlockArg): Promise<unknown> {
    return {
      value: window.prompt(message, defaultValue),
    };
  }
}

registerBlock(new Prompt());
