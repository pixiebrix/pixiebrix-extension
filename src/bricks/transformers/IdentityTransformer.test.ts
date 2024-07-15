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

import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import IdentityTransformer from "@/bricks/transformers/IdentityTransformer";
import { brickOptionsFactory } from "@/testUtils/factories/runtimeFactories";
import { validateBrickInputOutput } from "@/validators/schemaValidator";
import { throwIfInvalidInput } from "@/runtime/runtimeUtils";
import { toExpression } from "@/utils/expressionUtils";
import { type RenderedArgs } from "@/types/runtimeTypes";

const brick = new IdentityTransformer();

describe("IdentityTransformer.schema", () => {
  it.each([null, "hello", 42, [], {}])(
    "allows validateInput: %s",
    async (value) => {
      await expect(
        validateBrickInputOutput(brick.inputSchema, value),
      ).resolves.toStrictEqual({
        errors: [],
        valid: true,
      });
    },
  );

  it.each([null, "hello", 42, [], {}])(
    "allow throwIfInvalidInput: %s",
    async (value) => {
      await expect(
        throwIfInvalidInput(brick, unsafeAssumeValidArg<RenderedArgs>(value)),
      ).resolves.toBeUndefined();
    },
  );
});

describe("IdentityTransformer.run", () => {
  it("returns same value", async () => {
    const value = { foo: "bar" };
    const result = await brick.run(
      unsafeAssumeValidArg(value),
      brickOptionsFactory(),
    );
    expect(result).toStrictEqual(value);
  });

  it("accepts null", async () => {
    const result = await brick.run(
      unsafeAssumeValidArg(null),
      brickOptionsFactory(),
    );
    expect(result).toBeNull();
  });

  it("accepts array", async () => {
    const result = await brick.run(
      unsafeAssumeValidArg([]),
      brickOptionsFactory(),
    );
    expect(result).toStrictEqual([]);
  });
});

describe("IdentityTransformer.getOutputSchema", () => {
  it("returns schema for plain object", () => {
    const schema = brick.getOutputSchema({
      id: IdentityTransformer.BRICK_ID,
      config: {
        foo: "bar",
      },
    });
    expect(schema).toStrictEqual({
      type: "object",
      // Allow any under each property
      properties: {
        foo: {},
      },
      required: ["foo"],
    });
  });

  it("returns undefined for expression", () => {
    const schema = brick.getOutputSchema({
      id: IdentityTransformer.BRICK_ID,
      config: toExpression("var", "@foo"),
    });
    expect(schema).toBeUndefined();
  });

  it("returns array type", () => {
    const schema = brick.getOutputSchema({
      id: IdentityTransformer.BRICK_ID,
      config: [] as any,
    });
    expect(schema).toStrictEqual({
      type: "array",
      items: {},
    });
  });
});
