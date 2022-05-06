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

import { JQTransformer } from "@/blocks/transformers/jq";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import ConsoleLogger from "@/utils/ConsoleLogger";
import { InputValidationError } from "@/blocks/errors";
import { BusinessError } from "@/errors";

describe("parse compile error", () => {
  test("invalid fromdate", async () => {
    // https://github.com/pixiebrix/pixiebrix-extension/issues/3216
    const promise = new JQTransformer().transform(
      unsafeAssumeValidArg({ filter: '"" | fromdate', input: {} }),
      {
        ctxt: {},
        root: null,
        logger: new ConsoleLogger(),
      }
    );

    await expect(promise).rejects.toThrowError(InputValidationError);
    await expect(promise).rejects.toThrowError(
      'date "" does not match format "%Y-%m-%dT%H:%M:%SZ"'
    );
  });

  test("missing brace", async () => {
    // https://github.com/pixiebrix/pixiebrix-extension/issues/3216
    const promise = new JQTransformer().transform(
      unsafeAssumeValidArg({ filter: "{", input: {} }),
      {
        ctxt: {},
        root: null,
        logger: new ConsoleLogger(),
      }
    );

    await expect(promise).rejects.toThrowError(InputValidationError);
    await expect(promise).rejects.toThrowError(
      "Unexpected end of jq filter, are you missing a parentheses, brace, and/or quote mark?"
    );
  });

  test("null iteration", async () => {
    // https://github.com/pixiebrix/pixiebrix-extension/issues/3216
    const promise = new JQTransformer().transform(
      unsafeAssumeValidArg({ filter: ".foo[]", input: {} }),
      {
        ctxt: {},
        root: null,
        logger: new ConsoleLogger(),
      }
    );

    await expect(promise).rejects.toThrowError(BusinessError);
    await expect(promise).rejects.toThrowError(
      "Cannot iterate over null (null)"
    );
  });
});
