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

import { type BrickArgs, type BrickOptions } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { type JsonObject } from "type-fest";
import { TransformerABC } from "@/types/bricks/transformerTypes";
import { validateRegistryId } from "@/types/helpers";
import { type BrickConfig } from "@/bricks/types";
import { isObject } from "@/utils/objectUtils";
import { mapValues } from "lodash";
import { castTextLiteralOrThrow } from "@/utils/expressionUtils";
import { propertiesToSchema } from "@/utils/schemaUtils";
import {
  type MergeStrategy,
  type StateNamespace,
  StateNamespaces,
} from "@/platform/state/stateController";

/**
 * Namespace options for use in oneOf.
 */
export const namespaceOptions = [
  { const: StateNamespaces.MOD, title: "Mod" },
  {
    const: StateNamespaces.PRIVATE,
    title: "Private",
  },
  { const: StateNamespaces.PUBLIC, title: "Public" },
] as Schema[];

export class SetPageState extends TransformerABC {
  static readonly BRICK_ID = validateRegistryId("@pixiebrix/state/set");

  constructor() {
    super(
      SetPageState.BRICK_ID,
      "Set shared page state",
      "Set shared page state values and returns the updated state",
    );
  }

  override async isPure(): Promise<boolean> {
    return false;
  }

  override async isPageStateAware(): Promise<boolean> {
    return true;
  }

  override defaultOutputKey = "state";

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
        default: StateNamespaces.MOD,
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
    ["data"],
  );

  override uiSchema = {
    "ui:order": ["namespace", "mergeStrategy", "data"],
  };

  override async getModVariableSchema(
    _config: BrickConfig,
  ): Promise<Schema | undefined> {
    const { data, namespace = StateNamespaces.MOD } = _config.config;

    try {
      if (castTextLiteralOrThrow(namespace) !== StateNamespaces.MOD) {
        return;
      }
    } catch {
      return;
    }

    if (isObject(data)) {
      return {
        type: "object",
        // Only track the existence of the properties, not their values
        properties: mapValues(data, () => true),
        required: Object.keys(data),
        additionalProperties: false,
      };
    }

    return {
      type: "object",
      additionalProperties: true,
    };
  }

  async transform(
    {
      data,
      mergeStrategy = "shallow",
      namespace = StateNamespaces.MOD,
    }: BrickArgs<{
      data: JsonObject;
      namespace?: StateNamespace;
      mergeStrategy?: MergeStrategy;
    }>,
    { logger, platform }: BrickOptions,
  ): Promise<JsonObject> {
    const { blueprintId, extensionId } = logger.context;

    return platform.state.setState({
      namespace,
      data,
      mergeStrategy,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- TODO: https://github.com/pixiebrix/pixiebrix-extension/issues/7891
      extensionId: extensionId!,
      blueprintId,
    });
  }
}

export class GetPageState extends TransformerABC {
  static readonly BRICK_ID = validateRegistryId("@pixiebrix/state/get");

  constructor() {
    super(
      GetPageState.BRICK_ID,
      "Get shared page state",
      "Get shared page state values",
    );
  }

  override defaultOutputKey = "state";

  inputSchema: Schema = propertiesToSchema(
    {
      namespace: {
        title: "Namespace",
        type: "string",
        description:
          "Where to retrieve the data. If set to Mod and this Starter Brick is not part of a Mod, behaves as Public",
        oneOf: namespaceOptions,
        default: StateNamespaces.MOD,
      },
    },
    [],
  );

  override async isPure(): Promise<boolean> {
    // Doesn't have a side effect, but may return a different result each time
    return false;
  }

  override async isPageStateAware(): Promise<boolean> {
    return true;
  }

  async transform(
    {
      namespace = StateNamespaces.MOD,
    }: BrickArgs<{ namespace?: StateNamespace }>,
    { logger, platform }: BrickOptions,
  ): Promise<JsonObject> {
    const { blueprintId, extensionId } = logger.context;

    return platform.state.getState({
      namespace,
      blueprintId,
      extensionId,
    });
  }
}
