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

import { runOnDocumentVisible } from "@/utils/domUtils";

let hidden = true;

// https://github.com/jsdom/jsdom/issues/2391#issuecomment-429085358
Object.defineProperty(document, "hidden", {
  configurable: true,
  get() {
    return hidden;
  },
});

describe("runOnDocumentVisible", () => {
  beforeEach(() => {
    hidden = false;
  });

  it("runs immediately if visible", async () => {
    const mock = jest.fn();
    const fn = runOnDocumentVisible(mock);
    await fn();
    expect(mock).toHaveBeenCalledTimes(1);
  });

  /**
   * @jest-environment jsdom
   * @jest-environment-options {"hidden": true}
   */
  it("prefer trailing invocation", async () => {
    hidden = true;

    const mock = jest.fn();
    const fn = runOnDocumentVisible(mock);

    const callPromise1 = fn(1);
    const callPromise2 = fn(2);

    hidden = false;
    document.dispatchEvent(new Event("visibilitychange"));

    await callPromise1;
    await callPromise2;

    expect(mock).toHaveBeenCalledTimes(1);
    // Prefers the last invocation
    expect(mock).toHaveBeenCalledWith(2);
  });
});
