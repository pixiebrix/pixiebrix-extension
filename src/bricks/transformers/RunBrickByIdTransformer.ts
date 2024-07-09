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
import {
  type BrickArgs,
  type BrickOptions,
  type RenderedArgs,
} from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { validateRegistryId } from "@/types/helpers";
import type { RegistryId, RegistryProtocol } from "@/types/registryTypes";
import type { Brick } from "@/types/brickTypes";
import { BusinessError, PropError } from "@/errors/businessErrors";
import { throwIfInvalidInput } from "@/runtime/runtimeUtils";
import { propertiesToSchema } from "@/utils/schemaUtils";

/**
 * An experimental brick that runs a brick by its registry ID.
 *
 * Introduced to support dynamic function call scenarios, e.g., when being used a tool of ChatGPT.
 *
 * @since 1.8.6
 */
class RunBrickByIdTransformer extends TransformerABC {
  static BRICK_ID = validateRegistryId("@pixiebrix/reflect/run");

  constructor(private readonly registry: RegistryProtocol<RegistryId, Brick>) {
    super(
      RunBrickByIdTransformer.BRICK_ID,
      "[Experimental] Run Brick by ID",
      "Run a brick by its registry ID",
    );
  }

  inputSchema: Schema = propertiesToSchema(
    {
      registryId: {
        type: "string",
        description: "The PixieBrix registry id of the brick to run",
      },
      arguments: {
        type: "object",
        description:
          "Arguments to pass to the brick. The arguments must match the brick's input schema.",
      },
    },
    ["registryId", "arguments"],
  );

  async transform(
    {
      registryId,
      arguments: rawArguments,
    }: BrickArgs<{ registryId: string; arguments: UnknownObject }>,
    options: BrickOptions,
  ): Promise<unknown> {
    try {
      validateRegistryId(registryId);
    } catch {
      throw new PropError(
        "Invalid registry id",
        this.id,
        "registryId",
        registryId,
      );
    }

    let brick;

    try {
      brick = await this.registry.lookup(registryId as RegistryId);
    } catch {
      throw new BusinessError(
        "Could not find brick with registry id: " + registryId,
      );
    }

    await throwIfInvalidInput(brick, rawArguments as RenderedArgs);

    const { logger, ...otherOptions } = options;

    return brick.run(rawArguments as BrickArgs, {
      logger: logger.childLogger({ brickId: brick.id }),
      ...otherOptions,
    });
  }
}

export default RunBrickByIdTransformer;
