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

import { Readable } from "./readable";
import { unsafeAssumeValidArg } from "../../runtime/runtimeTypes";
import { brickOptionsFactory } from "../../testUtils/factories/runtimeFactories";

const brick = new Readable();

describe("readable", () => {
  it("extracts readable content", async () => {
    document.body.innerHTML = "<div><h1>Title</h1><p>content</p></div>";

    const article = await brick.run(
      unsafeAssumeValidArg({}),
      brickOptionsFactory(),
    );

    expect(article).toEqual(
      expect.objectContaining({
        excerpt: "content",
        textContent: "Titlecontent",
      }),
    );
  });

  it("requires document root", async () => {
    document.body.innerHTML = "<div><h1>Title</h1><p>content</p></div>";

    const element = document.querySelector("div");

    const article = brick.run(
      unsafeAssumeValidArg({}),
      brickOptionsFactory({ root: element! }),
    );

    await expect(article).rejects.toThrow();
  });
});
