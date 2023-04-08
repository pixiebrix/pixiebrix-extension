/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { type BlockArg, type BlockOptions } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { propertiesToSchema } from "@/validators/generic";
import { type JsonObject } from "type-fest";
import { getPageState, setPageState } from "@/contentScript/pageState";
import { Transformer } from "@/types/blocks/transformerTypes";

type MergeStrategy = "shallow" | "replace" | "deep";
export type Namespace = "blueprint" | "extension" | "shared";

export class SetPageState extends Transformer {
  constructor() {
    super(
      "@pixiebrix/state/set",
      "Set shared page state",
      "Set shared page state values and returns the updated state"
    );
  }

  override async isPure(): Promise<boolean> {
    return false;
  }

  defaultOutputKey = "state";

  inputSchema: Schema = propertiesToSchema(
    {
      data: {
        type: "object",
        description: "The data to set",
        additionalProperties: true,
      },
      namespace: {
        type: "string",
        description:
          "The namespace for the storage, to avoid conflicts. If set to blueprint and the extension is not part of a blueprint, defaults to shared",
        enum: ["blueprint", "extension", "shared"],
        default: "blueprint",
      },
      mergeStrategy: {
        type: "string",
        enum: ["shallow", "replace", "deep"],
        default: "shallow",
      },
    },
    ["data"]
  );

  async transform(
    {
      data,
      mergeStrategy = "shallow",
      namespace = "blueprint",
    }: BlockArg<{
      data: JsonObject;
      namespace?: Namespace;
      mergeStrategy?: MergeStrategy;
    }>,
    { logger }: BlockOptions
  ): Promise<JsonObject> {
    const { blueprintId = null, extensionId } = logger.context;

    return setPageState({
      namespace,
      data,
      mergeStrategy,
      extensionId,
      blueprintId,
    });
  }
}

export class GetPageState extends Transformer {
  constructor() {
    super(
      "@pixiebrix/state/get",
      "Get shared page state",
      "Get shared page state values"
    );
  }

  defaultOutputKey = "state";

  inputSchema: Schema = propertiesToSchema(
    {
      namespace: {
        type: "string",
        description:
          "The namespace for the storage, to avoid conflicts. If set to blueprint and the extension is not part of a blueprint, defaults to shared",
        enum: ["blueprint", "extension", "shared"],
        default: "blueprint",
      },
    },
    []
  );

  override async isPure(): Promise<boolean> {
    // Doesn't have a side effect, but may return a different result each time
    return false;
  }

  async transform(
    { namespace = "blueprint" }: BlockArg<{ namespace?: Namespace }>,
    { logger }: BlockOptions
  ): Promise<JsonObject> {
    const { blueprintId = null, extensionId } = logger.context;
    return getPageState({ namespace, blueprintId, extensionId });
  }
}
