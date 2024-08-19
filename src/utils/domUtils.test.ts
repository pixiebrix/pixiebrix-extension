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

import {
  isNativeCssSelector,
  isSingleHtmlElementString,
  isValidSelector,
  runOnDocumentVisible,
} from "@/utils/domUtils";

let hidden = false;

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

  it("handle multiple invocations", async () => {
    const mock = jest.fn();
    const fn = runOnDocumentVisible(mock);

    const numCalls = 3;

    for (let i = 0; i < numCalls; i++) {
      hidden = true;
      document.dispatchEvent(new Event("visibilitychange"));

      void fn(i);

      hidden = false;
      document.dispatchEvent(new Event("visibilitychange"));

      expect(mock).toHaveBeenCalledWith(i);
    }

    expect(mock).toHaveBeenCalledTimes(numCalls);
  });
});

describe("isNativeCssSelector", () => {
  it.each(["div", ".foo:has(.bar)"])(
    "returns true for native CSS selector: %s",
    (selector) => {
      expect(isNativeCssSelector(selector)).toBeTrue();
    },
  );

  it.each(['div:contains("foo")', "div:visible"])(
    "returns false for JQuery selector: %s",
    (selector) => {
      expect(isNativeCssSelector(selector)).toBeFalse();
    },
  );
});

describe("isValidSelector", () => {
  it.each(["div", ".foo:has(.bar)", 'div:contains("foo")'])(
    "returns true for valid selector: %s",
    (selector) => {
      expect(isValidSelector(selector)).toBeTrue();
    },
  );

  it.each(['div:contains("foo")', "div:visible"])(
    "returns true for valid jquery selector: %s",
    (selector) => {
      expect(isValidSelector(selector)).toBeTrue();
    },
  );

  it.each(["!foo"])("returns false for invalid selector: %s", (selector) => {
    expect(isValidSelector(selector)).toBeFalse();
  });
});

describe("isSingleHtmlElementString", () => {
  it("returns true for single element", () => {
    expect(isSingleHtmlElementString("<div></div>")).toBeTrue();
  });
  it("returns false for two elements", () => {
    expect(isSingleHtmlElementString("<div></div><div></div>")).toBeFalse();
  });
  it("returns false for whitespace", () => {
    expect(isSingleHtmlElementString(" ")).toBeFalse();
  });
  it("returns false for text", () => {
    expect(isSingleHtmlElementString("foo")).toBeFalse();
  });
  it("allows custom tag", () => {
    expect(isSingleHtmlElementString("<foo></foo>")).toBeTrue();
  });
});
