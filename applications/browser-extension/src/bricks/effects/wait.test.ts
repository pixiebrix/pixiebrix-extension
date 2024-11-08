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
import { WaitElementEffect } from "./wait";
import { BusinessError } from "@/errors/businessErrors";
import { ensureMocksReset, requestIdleCallback } from "@shopify/jest-dom-mocks";
import { brickOptionsFactory } from "../../testUtils/factories/runtimeFactories";

beforeAll(() => {
  requestIdleCallback.mock();
});

beforeEach(() => {
  ensureMocksReset();
});

const brick = new WaitElementEffect();

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

  it.each([undefined, false])(
    "wait element isRootAware: %s",
    async (isRootAware) => {
      await brick.run(
        unsafeAssumeValidArg({ selector: "button", isRootAware }),
        brickOptionsFactory(),
      );
    },
  );

  it("wait element for isRootAware: true", async () => {
    await brick.run(
      unsafeAssumeValidArg({ selector: "button", isRootAware: true }),
      brickOptionsFactory({
        root: document.querySelector<HTMLElement>("#hasButton")!,
      }),
    );
  });

  test("throws BusinessError on timeout", async () => {
    const promise = brick.run(
      unsafeAssumeValidArg({
        selector: "button",
        maxWaitMillis: 1,
        isRootAware: true,
      }),
      brickOptionsFactory({
        root: document.querySelector<HTMLElement>("#noButton")!,
      }),
    );

    await expect(promise).rejects.toThrow(BusinessError);
  });

  test("array of selectors", async () => {
    await brick.run(
      unsafeAssumeValidArg({ selector: ["#hasButton", "button"] }),
      brickOptionsFactory(),
    );
  });
});
