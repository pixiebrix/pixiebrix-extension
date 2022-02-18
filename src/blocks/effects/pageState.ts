/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { Transformer, UnknownObject } from "@/types";
import { BlockArg, BlockOptions, RegistryId, Schema, UUID } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { merge, cloneDeep } from "lodash";
import { BusinessError, PropError } from "@/errors";

const extensionState = new Map<UUID, UnknownObject>();

/**
 * The blueprint page state, or null for shared state
 */
const blueprintState = new Map<RegistryId | null, UnknownObject>();

type MergeStrategy = "shallow" | "replace" | "deep";
type Namespace = "blueprint" | "extension" | "shared";

function mergeState(
  previous: UnknownObject,
  update: UnknownObject,
  strategy: MergeStrategy
): UnknownObject {
  const cloned = cloneDeep(update);

  switch (strategy) {
    case "replace": {
      return cloned;
    }

    case "deep": {
      return merge(previous, cloned);
    }

    case "shallow": {
      return { ...previous, ...cloned };
    }

    default: {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- dynamic check for never type
      throw new BusinessError(`Unknown merge strategy: ${strategy}`);
    }
  }
}

export class SetPageState extends Transformer {
  constructor() {
    super(
      "@pixiebrix/state/set",
      "Set shared page state",
      "Set shared page state values"
    );
  }

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
      data: UnknownObject;
      namespace: Namespace;
      mergeStrategy: MergeStrategy;
    }>,
    { logger }: BlockOptions
  ): Promise<UnknownObject> {
    const { blueprintId = null, extensionId } = logger.context;

    switch (namespace) {
      case "shared": {
        const previous = blueprintState.get(null) ?? {};
        const next = mergeState(previous, data, mergeStrategy);
        blueprintState.set(null, next);
        return next;
      }

      case "blueprint": {
        const previous = blueprintState.get(blueprintId) ?? {};
        const next = mergeState(previous, data, mergeStrategy);
        blueprintState.set(blueprintId, next);
        return next;
      }

      case "extension": {
        if (extensionId == null) {
          throw new Error("Invalid context: extensionId not found");
        }

        const previous = extensionState.get(extensionId) ?? {};
        const next = mergeState(previous, data, mergeStrategy);
        extensionState.set(extensionId, next);
        return next;
      }

      default: {
        throw new PropError(
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- dynamic check for never
          `Invalid namespace: ${namespace}`,
          this.id,
          "namespace",
          namespace
        );
      }
    }
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

  async transform(
    { namespace }: BlockArg<{ namespace: Namespace }>,
    { logger }: BlockOptions
  ): Promise<UnknownObject> {
    const { blueprintId = null, extensionId } = logger.context;

    switch (namespace) {
      case "shared": {
        return blueprintState.get(null) ?? {};
      }

      case "blueprint": {
        return blueprintState.get(blueprintId) ?? {};
      }

      case "extension": {
        if (extensionId == null) {
          throw new Error("Invalid context: extensionId not found");
        }

        return extensionState.get(extensionId) ?? {};
      }

      default: {
        throw new PropError(
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- dynamic check for never
          `Invalid namespace: ${namespace}`,
          this.id,
          "namespace",
          namespace
        );
      }
    }
  }
}
