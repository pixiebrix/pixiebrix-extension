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

import { AlertEffect } from "@/bricks/effects/alert";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import { validateBrickInputOutput } from "@/validators/schemaValidator";
import { brickOptionsFactory } from "@/testUtils/factories/runtimeFactories";
import { platformMock } from "@/testUtils/platformMock";

const brick = new AlertEffect();

describe("AlertEffect", () => {
  it("type is optional", async () => {
    await expect(
      validateBrickInputOutput(brick.inputSchema, { message: "Hello, world!" }),
    ).resolves.toStrictEqual({
      errors: [],
      valid: true,
    });
  });

  it("type defaults to window if excluded", async () => {
    const platform = platformMock;

    await brick.run(
      unsafeAssumeValidArg({ message: "Hello, world!" }),
      brickOptionsFactory({
        platform,
      }),
    );
    expect(platform.alert).toHaveBeenCalledWith("Hello, world!");
  });
});
