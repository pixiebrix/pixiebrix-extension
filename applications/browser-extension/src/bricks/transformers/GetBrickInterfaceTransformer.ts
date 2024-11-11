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
import { type BrickArgs, type BrickOptions } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { validateRegistryId } from "@/types/helpers";
import type { RegistryId } from "@/types/registryTypes";
import { BusinessError, PropError } from "@/errors/businessErrors";
import { propertiesToSchema } from "@/utils/schemaUtils";

/**
 * An experimental brick that returns the interface of a brick by its registry ID.
 *
 * Introduced to support dynamic function call scenarios, e.g., when being used a tool of ChatGPT.
 *
 * @since 1.8.6
 */
class GetBrickInterfaceTransformer extends TransformerABC {
  static BRICK_ID = validateRegistryId("@pixiebrix/reflect/brick-get");

  constructor() {
    super(
      GetBrickInterfaceTransformer.BRICK_ID,
      "[Experimental] Get Brick Interface",
      "Return the interface for a brick",
    );
  }

  inputSchema: Schema = propertiesToSchema(
    {
      registryId: {
        type: "string",
        description: "The PixieBrix registry id of the brick to run",
      },
    },
    ["registryId"],
  );

  override async isPure(): Promise<boolean> {
    return true;
  }

  override async isRootAware(): Promise<boolean> {
    return false;
  }

  override async isPageStateAware(): Promise<boolean> {
    return false;
  }

  override outputSchema: Schema = propertiesToSchema(
    {
      id: {
        type: "string",
        description: "The brick's registry ID",
      },
      name: {
        type: "string",
        description: "The brick's name",
      },
      description: {
        type: "string",
        description: "The brick's description",
      },
      inputSchema: {
        type: "object",
        description: "The brick's input schema, as JSON Schema",
      },
      outputSchema: {
        type: "object",
        description: "The brick's defined output schema, as JSON Schema",
      },
    },
    ["id", "name", "inputSchema", "outputSchema"],
  );

  async transform(
    { registryId }: BrickArgs<{ registryId: string }>,
    { platform }: BrickOptions,
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
      brick = await platform.registry.bricks.lookup(registryId as RegistryId);
    } catch {
      throw new BusinessError(
        "Could not find brick with registry id: " + registryId,
      );
    }

    return {
      id: brick.id,
      name: brick.name,
      description: brick.description,
      inputSchema: brick.inputSchema,
      outputSchema: brick.outputSchema,
    };
  }
}

export default GetBrickInterfaceTransformer;
