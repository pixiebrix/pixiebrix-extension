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
import { echoBrick } from "../../runtime/pipelineTests/testHelpers";
import { unsafeAssumeValidArg } from "../../runtime/runtimeTypes";
import { brickOptionsFactory } from "../../testUtils/factories/runtimeFactories";
import GetBrickInterfaceTransformer from "./GetBrickInterfaceTransformer";
import { pick } from "lodash";
import { BusinessError } from "../../errors/businessErrors";

const brick = new GetBrickInterfaceTransformer(brickRegistry);

beforeEach(() => {
  brickRegistry.clear();
  brickRegistry.register([echoBrick, brick]);
});

describe("GetBrickInterfaceTransformer", () => {
  it("should return the brick interface", async () => {
    const result = await brick.run(
      unsafeAssumeValidArg({ registryId: echoBrick.id }),
      brickOptionsFactory(),
    );
    expect(result).toStrictEqual(
      pick(echoBrick, [
        "id",
        "name",
        "description",
        "inputSchema",
        "outputSchema",
      ]),
    );
  });

  it("throws on unknown brick", async () => {
    const result = brick.run(
      unsafeAssumeValidArg({ registryId: "@pixiebrix/not-registered" }),
      brickOptionsFactory(),
    );
    await expect(result).rejects.toThrow(BusinessError);
  });

  it("throws on invalid registry id", async () => {
    const result = brick.run(
      unsafeAssumeValidArg({ registryId: "!!!" }),
      brickOptionsFactory(),
    );
    await expect(result).rejects.toThrow(BusinessError);
  });
});
