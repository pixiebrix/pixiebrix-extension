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
import { validateRegistryId } from "@/types/helpers";
import { type BrickArgs, type BrickOptions } from "@/types/runtimeTypes";
import { type UiSchema } from "@/types/schemaTypes";
import { type JSONSchema7 } from "json-schema";
import { type JsonObject } from "type-fest";
import type { PlatformCapability } from "@/platform/capabilities";
import { propertiesToSchema } from "@/utils/schemaUtils";

export class JavaScriptTransformer extends TransformerABC {
  static readonly BRICK_ID = validateRegistryId("@pixiebrix/javascript");

  override async isPure(): Promise<boolean> {
    // It's not actually "pure", because the user could call a method like Math.random() or Date.now()
    // We're marking it as pure because it's safe for the Page Editor to run the preview on
    return true;
  }

  override async isRootAware(): Promise<boolean> {
    return false;
  }

  constructor() {
    super(
      JavaScriptTransformer.BRICK_ID,
      "Run JavaScript Function",
      "Run a JavaScript function and return the result",
    );
  }

  override inputSchema: JSONSchema7 = propertiesToSchema(
    {
      function: {
        title: "Function",
        type: "string",
        description: "The JavaScript function",
      },
      arguments: {
        title: "Arguments",
        type: "object",
        description: "The arguments to pass to the function",
      },
    },
    ["function"],
  );

  override uiSchema: UiSchema = {
    function: {
      "ui:widget": "CodeEditorWidget",
    },
  };

  override async getRequiredCapabilities(): Promise<PlatformCapability[]> {
    return ["sandbox"];
  }

  override async transform(
    input: BrickArgs<{
      function: string;
      arguments?: JsonObject;
    }>,
    { platform }: BrickOptions,
  ): Promise<unknown> {
    return platform.runSandboxedJavascript({
      code: input.function,
      data: input.arguments,
    });
  }
}
