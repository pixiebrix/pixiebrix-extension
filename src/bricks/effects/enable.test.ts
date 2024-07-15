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

import { EnableEffect } from "@/bricks/effects/enable";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import { brickOptionsFactory } from "@/testUtils/factories/runtimeFactories";

const brick = new EnableEffect();

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

  it.each([undefined, false])(
    "enables element for isRootAware: %s",
    async (isRootAware) => {
      await brick.run(
        unsafeAssumeValidArg({ selector: "button", isRootAware }),
        brickOptionsFactory(),
      );

      expect(document.querySelector("button")).not.toBeDisabled();
    },
  );

  it("enables element for isRootAware: true", async () => {
    await brick.run(
      unsafeAssumeValidArg({ isRootAware: true }),
      brickOptionsFactory({ root: document.querySelector("button")! }),
    );

    expect(document.querySelector("button")).not.toBeDisabled();
  });
});
