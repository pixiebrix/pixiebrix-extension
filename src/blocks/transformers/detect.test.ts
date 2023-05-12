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

import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import ConsoleLogger from "@/utils/ConsoleLogger";
import { type BlockOptions } from "@/types/runtimeTypes";
import { DetectElement } from "@/blocks/transformers/detect";

import { uuidSequence } from "@/testUtils/factories/stringFactories";

const brick = new DetectElement();

const logger = new ConsoleLogger({
  extensionId: uuidSequence(0),
});

describe("DetectElement", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <html>
        <body>
          <div id="noButton"></div>
          <div id="hasButton">
            <button>Click me</button>
          </div>
        </body>
      </html>
    `;
  });

  test("isRootAware", async () => {
    await expect(brick.isRootAware()).resolves.toBe(true);
  });

  test.each([undefined, false])(
    "it detects element: %s",
    async (isRootAware) => {
      const result = await brick.run(
        unsafeAssumeValidArg({ selector: "button", isRootAware }),
        { root: document, logger } as BlockOptions
      );

      expect(result).toStrictEqual({
        count: 1,
        exists: true,
      });
    }
  );

  test("it uses root if isRootAware: true", async () => {
    const result = await brick.run(
      unsafeAssumeValidArg({ selector: "button", isRootAware: true }),
      {
        root: document.querySelector("#noButton"),
        logger,
      } as unknown as BlockOptions
    );

    expect(result).toStrictEqual({
      count: 0,
      exists: false,
    });
  });
});
