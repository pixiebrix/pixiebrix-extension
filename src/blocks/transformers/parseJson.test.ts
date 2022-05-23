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

import { BusinessError } from "@/errors";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import ParseJson from "@/blocks/transformers/ParseJson";
import { neverPromise } from "@/testUtils/testHelpers";

describe("ParseJson block", () => {
  test("Parse object", async () => {
    const brick = new ParseJson();

    const arg = unsafeAssumeValidArg({ content: '{"foo": 42}' });

    const result = await brick.run(arg, {
      ctxt: null,
      logger: null,
      root: null,
      runPipeline: neverPromise,
    });

    expect(result).toEqual({
      foo: 42,
    });
  });
});

test("Throw BusinessError on invalid JSON", async () => {
  const brick = new ParseJson();
  await expect(async () => {
    await brick.run(unsafeAssumeValidArg({ content: '{"foo": 42,}' }), {
      ctxt: null,
      logger: null,
      root: null,
      runPipeline: neverPromise,
    });
  }).rejects.toThrowError(BusinessError);
});
