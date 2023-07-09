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

import { type BrickArgs, type BrickOptions } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { propertiesToSchema } from "@/validators/generic";
import { type JsonObject } from "type-fest";
import { getPageState, setPageState } from "@/contentScript/pageState";
import { Transformer } from "@/types/bricks/transformerTypes";
import { validateRegistryId } from "@/types/helpers";

type MergeStrategy = "shallow" | "replace" | "deep";
export type Namespace = "blueprint" | "extension" | "shared";

/**
 * Namespace options for use in oneOf.
 */
export const namespaceOptions = [
  { const: "blueprint", title: "Mod (formerly called blueprint)" },
  {
    const: "extension",
    title: "Private (formerly called extension)",
  },
  { const: "shared", title: "Public (formerly called shared)" },
] as Schema[];

export class SetPageState extends Transformer {
  static readonly BRICK_ID = validateRegistryId("@pixiebrix/state/set");

  constructor() {
    super(
      SetPageState.BRICK_ID,
      "Set shared page state",
      "Set shared page state values and returns the updated state"
    );
  }

  override async isPure(): Promise<boolean> {
    return false;
  }

  override async isPageStateAware(): Promise<boolean> {
    return true;
  }

  defaultOutputKey = "state";

  inputSchema: Schema = propertiesToSchema(
    {
      data: {
        title: "Data",
        type: "object",
        description: "The properties to set on the state.",
        additionalProperties: true,
      },
      namespace: {
        title: "Namespace",
        type: "string",
        description:
          "Where to set the data. If set to Mod and this Starter Brick is not part of a Mod, behaves as Public.",
        oneOf: namespaceOptions,
        default: "blueprint",
      },
      mergeStrategy: {
        title: "Merge Strategy",
        type: "string",
        oneOf: [
          { const: "shallow", title: "Shallow: replace existing properties" },
          { const: "replace", title: "Replace: replace the entire state" },
          {
            const: "deep",
            title: "Deep: recursively merge data with existing state",
          },
        ],
        description: "Strategy for merging the data with existing state.",
        default: "shallow",
      },
    },
    ["data"]
  );

  uiSchema = {
    "ui:order": ["namespace", "mergeStrategy", "data"],
  };

  async transform(
    {
      data,
      mergeStrategy = "shallow",
      namespace = "blueprint",
    }: BrickArgs<{
      data: JsonObject;
      namespace?: Namespace;
      mergeStrategy?: MergeStrategy;
    }>,
    { logger }: BrickOptions
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
  static readonly BRICK_ID = validateRegistryId("@pixiebrix/state/get");

  constructor() {
    super(
      GetPageState.BRICK_ID,
      "Get shared page state",
      "Get shared page state values"
    );
  }

  defaultOutputKey = "state";

  inputSchema: Schema = propertiesToSchema(
    {
      namespace: {
        title: "Namespace",
        type: "string",
        description:
          "Where to retrieve the data. If set to Mod and this Starter Brick is not part of a Mod, behaves as Public",
        oneOf: namespaceOptions,
        default: "blueprint",
      },
    },
    []
  );

  override async isPure(): Promise<boolean> {
    // Doesn't have a side effect, but may return a different result each time
    return false;
  }

  override async isPageStateAware(): Promise<boolean> {
    return true;
  }

  async transform(
    { namespace = "blueprint" }: BrickArgs<{ namespace?: Namespace }>,
    { logger }: BrickOptions
  ): Promise<JsonObject> {
    const { blueprintId = null, extensionId } = logger.context;
    return getPageState({ namespace, blueprintId, extensionId });
  }
}
