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
import { HideEffect } from "./hide";
import { brickOptionsFactory } from "../../testUtils/factories/runtimeFactories";

const brick = new HideEffect();

describe("HideEffect", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <html>
        <body>
          <button>Click me</button>
        </body>
      </html>
    `;
  });

  test("isRootAware", async () => {
    await expect(brick.isRootAware()).resolves.toBe(true);
  });

  it.each([undefined, false])(
    "hides element for isRootAware: %s",
    async (isRootAware) => {
      await brick.run(
        unsafeAssumeValidArg({ selector: "button", isRootAware }),
        brickOptionsFactory(),
      );

      expect(document.querySelector("button")).not.toBeVisible();
    },
  );

  it("hides element for isRootAware: true", async () => {
    await brick.run(
      unsafeAssumeValidArg({ isRootAware: true }),
      brickOptionsFactory({ root: document.querySelector("button")! }),
    );

    expect(document.querySelector("button")).not.toBeVisible();
  });

  it("removes element", async () => {
    await brick.run(
      unsafeAssumeValidArg({ isRootAware: true, mode: "remove" }),
      brickOptionsFactory({ root: document.querySelector("button")! }),
    );

    expect(document.querySelector("button")).toBeNull();
  });
});
