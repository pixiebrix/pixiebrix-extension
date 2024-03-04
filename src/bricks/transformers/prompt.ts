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

import { TransformerABC } from "@/types/bricks/transformerTypes";
import type { BrickArgs, BrickOptions } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { CancelError } from "@/errors/businessErrors";
import type { PlatformCapability } from "@/platform/capabilities";
import { propertiesToSchema } from "@/utils/schemaUtils";

export class Prompt extends TransformerABC {
  constructor() {
    super(
      "@pixiebrix/prompt",
      "Prompt for input",
      "Show a browser prompt for a single input",
    );
  }

  override defaultOutputKey = "userInput";

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
    ["message"],
  );

  override async getRequiredCapabilities(): Promise<PlatformCapability[]> {
    return ["alert"];
  }

  override outputSchema: Schema = propertiesToSchema(
    {
      value: {
        type: "string",
        description: "The user-provided value",
      },
    },
    ["value"],
  );

  async transform(
    {
      message,
      defaultValue,
    }: BrickArgs<{ message: string; defaultValue: string }>,
    { platform }: BrickOptions,
  ): Promise<unknown> {
    const value = platform.prompt(message, defaultValue);

    if (value == null) {
      throw new CancelError("User cancelled the prompt");
    }

    return {
      value,
    };
  }
}
