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
import { AttachAutocomplete } from "./attachAutocomplete";
import { brickOptionsFactory } from "../../testUtils/factories/runtimeFactories";

const brick = new AttachAutocomplete();

describe("AttachAutocomplete", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <html>
        <body>
          <div id="noForm"></div>
          <div id="hasForm">
            <form>
              <input type="text" name="name" value="John Doe" />
            </form>
          </div>
        </body>
      </html>
    `;
  });

  test("isRootAware", async () => {
    await expect(brick.isRootAware()).resolves.toBe(true);
  });

  it("attaches autocomplete", async () => {
    await brick.run(
      unsafeAssumeValidArg({ selector: "[name='name']" }),
      brickOptionsFactory({
        root: document,
      }),
    );

    expect(document.querySelector("[name='name']")!.getAttribute("role")).toBe(
      "combobox",
    );
  });

  it("is root aware", async () => {
    await brick.run(
      unsafeAssumeValidArg({ selector: "[name='name']", isRootAware: true }),
      brickOptionsFactory({
        root: document.querySelector<HTMLElement>("#noForm")!,
      }),
    );

    expect(
      document.querySelector("[name='name']")!.getAttribute("role"),
    ).toBeNull();

    await brick.run(
      unsafeAssumeValidArg({ selector: "[name='name']", isRootAware: true }),
      brickOptionsFactory({
        root: document.querySelector<HTMLElement>("#hasForm")!,
      }),
    );

    expect(document.querySelector("[name='name']")!.getAttribute("role")).toBe(
      "combobox",
    );
  });
});
