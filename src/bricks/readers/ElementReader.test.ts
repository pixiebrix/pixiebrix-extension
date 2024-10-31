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

import { ElementReader } from "@/bricks/readers/ElementReader";
import { validateUUID } from "@/types/helpers";
import { rectFactory } from "@/testUtils/factories/domFactories";

const reader = new ElementReader();

describe("ElementReader", () => {
  beforeEach(() => {
    // `jsdom` does not implement full layout engine
    // https://github.com/jsdom/jsdom#unimplemented-parts-of-the-web-platform
    (Element.prototype.getBoundingClientRect as any) = jest.fn(() =>
      rectFactory(),
    );
  });

  it("produces valid element reference", async () => {
    const div = document.createElement("div");
    const { ref } = await reader.read(div);
    expect(validateUUID(ref)).not.toBeNull();
  });

  test("isVisible: false for element not in document", async () => {
    const div = document.createElement("div");
    const { isVisible } = await reader.read(div);
    expect(isVisible).toBe(false);
  });

  // This isn't what isVisible means, but we're testing the bare minimum.
  // This test only checks our own checkVisibility() implementation in testEnv.js
  // https://github.com/jsdom/jsdom/issues/135#issuecomment-29812947
  test("isVisible: true for element in document", async () => {
    const div = document.createElement("div");
    div.innerHTML = "<p>Some text</p>";
    document.body.append(div);

    const { isVisible } = await reader.read(div);
    expect(isVisible).toBe(true);
  });

  test("isInViewport: true for element in document", async () => {
    const div = document.createElement("div");
    div.innerHTML = "<p>Some text</p>";
    document.body.append(div);

    const { isInViewport } = await reader.read(div);
    expect(isInViewport).toBe(true);
  });

  test("isInViewport: false for element partially outside of document", async () => {
    (HTMLElement.prototype.getBoundingClientRect as any) = jest.fn(() =>
      rectFactory({
        width: window.innerWidth + 1,
        right: window.innerWidth + 1,
      }),
    );

    const div = document.createElement("div");
    div.innerHTML = "<p>Some text</p>";
    document.body.append(div);

    const { isInViewport } = await reader.read(div);
    expect(isInViewport).toBe(false);
  });
});
