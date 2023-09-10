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

import { defaultBlockConfig, isOfficial, retryWithJitter } from "./util";
import { type RegistryId } from "@/types/registryTypes";
import IfElse from "./transformers/controlFlow/IfElse";
import { EMPTY_PIPELINE } from "@/testUtils/testHelpers";
import { type Schema } from "@/types/schemaTypes";

describe("isOfficial", () => {
  test("returns true for an official block", () => {
    expect(isOfficial("@pixiebrix/api" as RegistryId)).toBeTruthy();
  });
  test("returns false for a 3d-party block", () => {
    expect(isOfficial("@non/pixiebrix" as RegistryId)).toBeFalsy();
  });
});

describe("defaultBlockConfig", () => {
  test("initialize pipeline props", () => {
    const ifElse = new IfElse();
    const actual = defaultBlockConfig(ifElse.inputSchema);

    expect(actual.if).toEqual(EMPTY_PIPELINE);
    expect(actual.else).toEqual(EMPTY_PIPELINE);
  });

  test("handles explicit default value of false", () => {
    const schema = {
      $schema: "https://json-schema.org/draft/2019-09/schema#",
      type: "object",
      properties: {
        myProp: {
          title: "My Property",
          type: "boolean",
          default: false,
        },
      },
    } as Schema;
    const config = defaultBlockConfig(schema);
    expect(config.myProp).toStrictEqual(false);
  });
});

describe("retryWithJitter", () => {
  test("it executes a function successfully and returns the result", async () => {
    const fn = jest.fn(async () => 1);
    const result = await retryWithJitter(fn, 3);
    expect(result).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("it retries a function that fails once and returns the result", async () => {
    const fn = jest.fn(async () => {
      if (fn.mock.calls.length === 1) {
        throw new Error("error");
      }

      return 1;
    });
    const result = await retryWithJitter(fn, 2);
    expect(result).toBe(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("it throws an error if the function fails more than the max retries", async () => {
    const fn = jest.fn(async () => {
      throw new Error("error");
    });

    await expect(retryWithJitter(fn, 3)).rejects.toThrow("error");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test("it retries on the specified error, and throws on all other errors", async () => {
    const fn = jest.fn(async () => {
      if (fn.mock.calls.length === 1) {
        throw new Error("a specified error");
      }

      throw new Error("different non-specified error");
    });

    await expect(
      retryWithJitter(fn, 3, (error) =>
        (error as Error).message.includes("a specified error")
      )
    ).rejects.toThrow("different non-specified error");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
