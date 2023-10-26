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

import {
  renderNunjucksTemplate,
  runUserJs,
} from "@/sandbox/messenger/executor";
import {
  BusinessError,
  InvalidTemplateError,
  PropError,
} from "@/errors/businessErrors";
import { JavaScriptTransformer } from "@/bricks/transformers/javascript";

describe("renderNunjucksTemplate", () => {
  it("handles template", async () => {
    await expect(
      renderNunjucksTemplate({
        template: "{{ hello }}",
        context: { hello: "world" },
        autoescape: false,
      })
    ).resolves.toBe("world");
  });

  it("handles malformed template", async () => {
    await expect(
      renderNunjucksTemplate({
        template: "{{ hello",
        context: { hello: "world" },
        autoescape: false,
      })
    ).rejects.toThrow(InvalidTemplateError);
  });

  it("handles non-nunjucks error", async () => {
    jest.doMock("@/sandbox/messenger/executor", () => ({
      renderString: jest.fn().mockImplementation(() => {
        throw new Error("test");
      }),
    }));

    await expect(
      renderNunjucksTemplate({
        template: "{{ hello",
        context: { hello: "world" },
        autoescape: false,
      })
    ).rejects.toThrow(Error);

    jest.resetAllMocks();
  });
});

describe("runUserJs", () => {
  it("executes the user-defined code and returns the result", async () => {
    await expect(
      runUserJs({
        code: "function () { return 1 + 1; };",
        blockId: JavaScriptTransformer.BRICK_ID,
      })
    ).resolves.toBe(2);
  });

  it("executes the user-defined code with the data and returns the result", async () => {
    await expect(
      runUserJs({
        code: "function (data) { return data.hello + ' world'; };",
        data: { hello: "hello" },
        blockId: JavaScriptTransformer.BRICK_ID,
      })
    ).resolves.toBe("hello world");
  });

  it("executes the user-defined code with the data and awaits the result if the code is an async function", async () => {
    await expect(
      runUserJs({
        code: "async function (data) { return data.hello + ' world'; };",
        data: { hello: "hello" },
        blockId: JavaScriptTransformer.BRICK_ID,
      })
    ).resolves.toBe("hello world");
  });

  it("throws a PropError if the Function Constructor throws an error", async () => {
    const malformedCode = "func() { return 1 + 1; };";

    await expect(async () =>
      runUserJs({
        code: malformedCode,
        data: {},
        blockId: JavaScriptTransformer.BRICK_ID,
      })
    ).rejects.toThrow(PropError);
  });

  it("throws a Business error if the user-defined function throws an error", async () => {
    const errorCode = "function () { throw new Error('test'); };";

    await expect(async () =>
      runUserJs({
        code: errorCode,
        data: {},
        blockId: JavaScriptTransformer.BRICK_ID,
      })
    ).rejects.toThrow(BusinessError);
  });
});
