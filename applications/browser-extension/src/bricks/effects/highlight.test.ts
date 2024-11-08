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
import { HighlightEffect } from "./highlight";
import { brickOptionsFactory } from "../../testUtils/factories/runtimeFactories";

describe("highlight", () => {
  test.each([[undefined], ["yellow"]])(
    "highlight multiple matches with rootSelector",
    async (color) => {
      document.body.innerHTML = `
            <div class="a">Foo</div>
            <div class="a">Bar</div>
            <div>Baz</div>
        `;

      const brick = new HighlightEffect();
      await brick.run(
        unsafeAssumeValidArg({
          rootSelector: ".a",
          color,
        }),
        brickOptionsFactory(),
      );

      expect(document.body.innerHTML).toMatchSnapshot();
    },
  );

  test("is root aware if rootMode is 'inherit'", async () => {
    document.body.innerHTML = `
            <div id="tree">
                <span>Foo</span>
                <span>Bar</span>
            </div>
            <div>
                <span>Baz</span>
            </div>
        `;

    const brick = new HighlightEffect();
    await brick.run(
      unsafeAssumeValidArg({
        rootSelector: "span",
        rootMode: "inherit",
      }),
      brickOptionsFactory({
        root: document.querySelector<HTMLElement>("#tree")!,
      }),
    );

    expect(document.body.innerHTML).toMatchSnapshot();
  });

  test.each(["document", undefined])(
    "is root un-aware if rootMode is '%s'",
    async (rootMode) => {
      document.body.innerHTML = `
            <div id="tree">
                <span>Foo</span>
                <span>Bar</span>
            </div>
            <div>
                <span>Baz</span>
            </div>
        `;

      const brick = new HighlightEffect();
      await brick.run(
        unsafeAssumeValidArg({
          rootSelector: "span",
          rootMode,
        }),
        brickOptionsFactory({
          root: document.querySelector<HTMLElement>("#tree")!,
        }),
      );

      expect(document.body.innerHTML).toMatchSnapshot();
    },
  );
});
