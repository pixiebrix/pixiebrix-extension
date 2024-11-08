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

import { unsafeAssumeValidArg } from "../../runtime/runtimeTypes";
import ParseJson from "./ParseJson";
import { BusinessError } from "../../errors/businessErrors";
import { brickOptionsFactory } from "../../testUtils/factories/runtimeFactories";

describe("ParseJson block", () => {
  test("Parse object", async () => {
    const brick = new ParseJson();

    const arg = unsafeAssumeValidArg({ content: '{"foo": 42}' });

    const result = await brick.run(arg, brickOptionsFactory());

    expect(result).toEqual({
      foo: 42,
    });
  });

  test("Allow JSON5 trailing comma", async () => {
    const brick = new ParseJson();
    const result = await brick.run(
      unsafeAssumeValidArg({ content: '{"foo": 42,}' }),
      brickOptionsFactory(),
    );

    expect(result).toEqual({
      foo: 42,
    });
  });

  test("Throw BusinessError on invalid JSON", async () => {
    const brick = new ParseJson();
    await expect(async () => {
      await brick.run(
        unsafeAssumeValidArg({ content: '{"foo":}' }),
        brickOptionsFactory(),
      );
    }).rejects.toThrow(BusinessError);
  });

  test("Throw BusinessError on invalid JSON5 if JSON5 not allowed", async () => {
    const brick = new ParseJson();
    await expect(async () => {
      await brick.run(
        unsafeAssumeValidArg({ content: '{"foo": 42,}', allowJson5: false }),
        brickOptionsFactory(),
      );
    }).rejects.toThrow(BusinessError);
  });

  test("Optional property quotes", async () => {
    const brick = new ParseJson();
    const result = await brick.run(
      unsafeAssumeValidArg({ content: "{foo: 42}" }),
      brickOptionsFactory(),
    );

    expect(result).toEqual({
      foo: 42,
    });
  });

  test("Handle leading and trailing text", async () => {
    const brick = new ParseJson();
    const result = await brick.run(
      unsafeAssumeValidArg({
        lenient: true,
        content: 'Sure, here\'s your response: {"foo": 42}. What do you think?',
      }),
      brickOptionsFactory(),
    );

    expect(result).toEqual({
      foo: 42,
    });
  });

  test("Errors on multiple peer objects", async () => {
    const brick = new ParseJson();
    await expect(async () => {
      await brick.run(
        unsafeAssumeValidArg({
          lenient: true,
          content: 'abc {"foo": 42} {"bar": 421}',
        }),
        brickOptionsFactory(),
      );
    }).rejects.toThrow(BusinessError);
  });

  test("Lenient returns array", async () => {
    const brick = new ParseJson();
    const result = await brick.run(
      unsafeAssumeValidArg({
        lenient: true,
        content: 'abc [{"foo": 42}, {"bar": 421}] def',
      }),
      brickOptionsFactory(),
    );

    expect(result).toEqual([
      { foo: 42 },
      {
        bar: 421,
      },
    ]);
  });

  test("Lenient handles nested array", async () => {
    const brick = new ParseJson();
    const result = await brick.run(
      unsafeAssumeValidArg({
        lenient: true,
        content: 'abc [[{"foo": 42}], {"bar": 421}] def',
      }),
      brickOptionsFactory(),
    );

    expect(result).toEqual([
      [{ foo: 42 }],
      {
        bar: 421,
      },
    ]);
  });
});
