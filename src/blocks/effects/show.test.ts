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
import { uuidSequence } from "@/testUtils/factories";
import { type BlockOptions } from "@/types/runtimeTypes";
import { ShowEffect } from "@/blocks/effects/show";

const brick = new ShowEffect();

const logger = new ConsoleLogger({
  extensionId: uuidSequence(0),
});

describe("ShowEffect", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <html>
        <body>
          <button style="display: none">Click me</button>
        </body>
      </html>
    `;
  });

  test("isRootAware", async () => {
    await expect(brick.isRootAware()).resolves.toBe(true);
  });

  test.each([undefined, false])(
    "it shows element for isRootAware: %s",
    async (isRootAware) => {
      expect(document.querySelector("button")).not.toBeVisible();

      await brick.run(
        unsafeAssumeValidArg({ selector: "button", isRootAware }),
        { root: document, logger } as BlockOptions
      );

      expect(document.querySelector("button")).toBeVisible();
    }
  );

  test("it shows element for isRootAware: true", async () => {
    await brick.run(unsafeAssumeValidArg({ isRootAware: true }), {
      root: document.querySelector("button"),
      logger,
    } as unknown as BlockOptions);

    expect(document.querySelector("button")).toBeVisible();
  });
});
