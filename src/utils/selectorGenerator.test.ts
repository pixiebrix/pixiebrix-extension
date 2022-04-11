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

import generateSelector from "./selectorGenerator";
import { JSDOM } from "jsdom";
import { html } from "@/utils";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- It's a global namespace
  namespace jest {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Must exist
    interface Matchers<R> {
      toFindSelector(selector: string): CustomMatcherResult;
    }
  }
}

function getDocument(html: string): Document {
  return new JSDOM(html).window.document;
}

expect.extend({
  toFindSelector(receivedHTML: string, selector: string) {
    const document = getDocument(receivedHTML);
    const element = document.querySelector<HTMLElement>(selector);
    const generatedSelector = generateSelector(element);

    return {
      pass: generatedSelector === selector,
      message: () =>
        `Expected \`${selector}\` but generated \`${generatedSelector}\``,
    };
  },
});

describe("generateSelector", () => {
  test("find simple selectors", () => {
    expect(html`<h1><span>Text</span></h1>`).toFindSelector("h1 > span");
    expect(
      html`<div>
        <div><h1></h1></div>
      </div>`
    ).toFindSelector("h1");
  });
});
