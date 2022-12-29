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

import { EnableEffect } from "@/blocks/effects/enable";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import ConsoleLogger from "@/utils/ConsoleLogger";
import { uuidSequence } from "@/testUtils/factories";
import { type BlockOptions } from "@/core";

const brick = new EnableEffect();

const logger = new ConsoleLogger({
  extensionId: uuidSequence(0),
});

describe("EnableEffect", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <html>
        <body>
          <button disabled>Click me</button>
        </body>
      </html>
    `;
  });

  test.each([[undefined], [false]])(
    "it enables element for isRootAware: %s",
    async (isRootAware) => {
      await brick.run(
        unsafeAssumeValidArg({ selector: "button", isRootAware }),
        { root: document, logger } as BlockOptions
      );

      expect(document.querySelector("button")).not.toBeDisabled();
    }
  );

  test("it enables element for isRootAware: true", async () => {
    await brick.run(unsafeAssumeValidArg({ isRootAware: true }), {
      root: document.querySelector("button"),
      logger,
    } as unknown as BlockOptions);

    expect(document.querySelector("button")).not.toBeDisabled();
  });
});
