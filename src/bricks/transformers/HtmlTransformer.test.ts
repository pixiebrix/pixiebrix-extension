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

import HtmlTransformer from "@/bricks/transformers/HtmlTransformer";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import { brickOptionsFactory } from "@/testUtils/factories/runtimeFactories";

const brick = new HtmlTransformer();

describe("HtmlTransformer", () => {
  it.each([undefined, true])(
    "handles open shadow dom for includeShadowDOM: %s",
    async (includeShadowDOM) => {
      document.body.innerHTML = '<div id="container"></div>';
      const container: HTMLElement = document.querySelector("#container");

      const shadowRoot = container.attachShadow({ mode: "open" });
      shadowRoot.innerHTML = '<div id="child">Inside Shadow DOM</div>';

      const result = await brick.transform(
        unsafeAssumeValidArg({ includeShadowDOM }),
        {
          ...brickOptionsFactory(),
          root: container,
        },
      );

      expect(result.outerHTML).toBe(
        '<div id="container"><shadow-root><div id="child">Inside Shadow DOM</div></shadow-root></div>',
      );
    },
  );

  it("can't view inside closed shadow dom", async () => {
    document.body.innerHTML = '<div id="container"></div>';
    const container: HTMLElement = document.querySelector("#container");

    const shadowRoot = container.attachShadow({ mode: "closed" });
    shadowRoot.innerHTML = '<div id="child">Inside Shadow DOM</div>';

    const result = await brick.transform(
      unsafeAssumeValidArg({ includeShadowDOM: true }),
      {
        ...brickOptionsFactory(),
        root: container,
      },
    );

    // Can't access the closed shadow dom because shadowRoot is null for closed shadow roots
    expect(result.outerHTML).toBe('<div id="container"></div>');
  });

  it("can remove non-visible elements", async () => {
    const original =
      '<div id="container"><div id="hidden" style="display: none;"></div></div>';
    document.body.innerHTML = original;
    const container: HTMLElement = document.querySelector("#container");

    const result = await brick.transform(
      unsafeAssumeValidArg({ includeNonVisible: false }),
      {
        ...brickOptionsFactory(),
        root: container,
      },
    );

    expect(result.outerHTML).toBe('<div id="container"></div>');
    // Ensure the original tree is not modified
    expect(document.body.innerHTML).toBe(original);
  });

  it("preserves non-visible elements by default", async () => {
    document.body.innerHTML =
      '<div id="container"><div id="hidden" style="display: none;"></div></div>';
    const container: HTMLElement = document.querySelector("#container");

    const result = await brick.transform(unsafeAssumeValidArg({}), {
      ...brickOptionsFactory(),
      root: container,
    });

    expect(result.outerHTML).toBe(
      '<div id="container"><div id="hidden" style="display: none;"></div></div>',
    );
  });
});
