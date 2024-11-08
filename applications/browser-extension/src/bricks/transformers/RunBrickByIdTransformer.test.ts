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

import brickRegistry from "../registry";
import { echoBrick, throwBrick } from "../../runtime/pipelineTests/testHelpers";
import RunBrickByIdTransformer from "./RunBrickByIdTransformer";
import { unsafeAssumeValidArg } from "../../runtime/runtimeTypes";
import { brickOptionsFactory } from "../../testUtils/factories/runtimeFactories";
import { InputValidationError } from "../errors";
import { BusinessError } from "../../errors/businessErrors";

const brick = new RunBrickByIdTransformer(brickRegistry);

beforeEach(() => {
  brickRegistry.clear();
  brickRegistry.register([echoBrick, throwBrick, brick]);
});

describe("RunBrickByIdTransformer", () => {
  it("should run a brick by id", async () => {
    const result = await brick.run(
      unsafeAssumeValidArg({
        registryId: echoBrick.id,
        arguments: {
          message: "Hello, world!",
        },
      }),
      brickOptionsFactory(),
    );

    expect(result).toStrictEqual({ message: "Hello, world!" });
  });

  it("throws on invalid inputs", async () => {
    const result = brick.run(
      unsafeAssumeValidArg({
        registryId: echoBrick.id,
        arguments: {
          message: 42,
        },
      }),
      brickOptionsFactory(),
    );

    await expect(result).rejects.toThrow(InputValidationError);
  });

  it("throws on unknown brick", async () => {
    const result = brick.run(
      unsafeAssumeValidArg({
        registryId: "@pixiebrix/not-registered",
        arguments: {
          message: 42,
        },
      }),
      brickOptionsFactory(),
    );

    await expect(result).rejects.toThrow(BusinessError);
  });

  it("throws on brick exception", async () => {
    const result = brick.run(
      unsafeAssumeValidArg({
        registryId: throwBrick.id,
        arguments: {
          message: 42,
        },
      }),
      brickOptionsFactory(),
    );

    await expect(result).rejects.toThrow(BusinessError);
  });
});
