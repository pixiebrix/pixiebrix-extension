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
import { WaitElementEffect } from "@/blocks/effects/wait";
import { BusinessError } from "@/errors/businessErrors";
import { ensureMocksReset, requestIdleCallback } from "@shopify/jest-dom-mocks";

beforeAll(() => {
  requestIdleCallback.mock();
});

beforeEach(() => {
  ensureMocksReset();
});

const brick = new WaitElementEffect();

const logger = new ConsoleLogger({
  extensionId: uuidSequence(0),
});

describe("WaitElementEffect", () => {
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
    "it wait element isRootAware: %s",
    async (isRootAware) => {
      await brick.run(
        unsafeAssumeValidArg({ selector: "button", isRootAware }),
        { root: document, logger } as BlockOptions
      );
    }
  );

  test("it wait element for isRootAware: true", async () => {
    await brick.run(
      unsafeAssumeValidArg({ selector: "button", isRootAware: true }),
      {
        root: document.querySelector("#hasButton"),
        logger,
      } as unknown as BlockOptions
    );
  });

  test("throws BusinessError on timeout", async () => {
    const promise = brick.run(
      unsafeAssumeValidArg({
        selector: "button",
        maxWaitMillis: 1,
        isRootAware: true,
      }),
      {
        root: document.querySelector("#noButton"),
        logger,
      } as unknown as BlockOptions
    );

    await expect(promise).rejects.toThrow(BusinessError);
  });

  test("array of selectors", async () => {
    await brick.run(
      unsafeAssumeValidArg({ selector: ["#hasButton", "button"] }),
      { root: document, logger } as unknown as BlockOptions
    );
  });
});
