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
import { ShowEffect } from "./show";
import { brickOptionsFactory } from "../../testUtils/factories/runtimeFactories";

const brick = new ShowEffect();

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

  it.each([undefined, false])(
    "shows element for isRootAware: %s",
    async (isRootAware) => {
      expect(document.querySelector("button")).not.toBeVisible();

      await brick.run(
        unsafeAssumeValidArg({ selector: "button", isRootAware }),
        brickOptionsFactory(),
      );

      expect(document.querySelector("button")).toBeVisible();
    },
  );

  it("shows element for isRootAware: true", async () => {
    await brick.run(
      unsafeAssumeValidArg({ isRootAware: true }),
      brickOptionsFactory({ root: document.querySelector("button")! }),
    );

    expect(document.querySelector("button")).toBeVisible();
  });
});
