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

import selectElement from "./selectElement";
import showSelectionToolPopover from "@/components/selectionToolPopover/showSelectionToolPopover";

// Mock because the React vs. JSDOM event handling and dom manipulation isn't playing nicely together
jest.mock("@/components/selectionToolPopover/showSelectionToolPopover");

const showSelectionToolPopoverMock = jest.mocked(showSelectionToolPopover);

beforeAll(() => {
  Element.prototype.scrollTo = jest.fn();
});

beforeEach(() => {
  showSelectionToolPopoverMock.mockClear();
});

describe("selectElement", () => {
  test("can select single element", async () => {
    document.body.innerHTML = "<div><span>hello</span></div>";
    const span = document.querySelector("span")!;

    const selectPromise = selectElement({
      mode: "element",
    });

    // React testing userEvent library doesn't seem to work here
    span.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );

    await expect(selectPromise).resolves.toEqual({
      parent: null,
      selectors: ["span"],
      tagName: "SPAN",
    });
  });

  test("can select relative to single root", async () => {
    document.body.innerHTML =
      '<div><div id="root"><span>hello</span></div><div><span>goodbye</span></div></div>';
    const span = document.querySelector("span")!;

    const selectPromise = selectElement({
      mode: "element",
      root: "#root",
    });

    // React testing userEvent library doesn't seem to work here
    span.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );

    await expect(selectPromise).resolves.toEqual({
      parent: null,
      // Can infer span because it's the only one under the root
      selectors: ["span"],
      tagName: "SPAN",
    });
  });

  test.each(["#root1", "#root2"])(
    "can select single element from any active root: %s",
    async (root) => {
      document.body.innerHTML =
        '<div><div id="root1" class="root"><span>hello</span></div><div id="root2" class="root"><span>goodbye</span></div></div>';

      const span = document.querySelector(`${root} span`)!;

      const selectPromise = selectElement({
        mode: "element",
        root,
      });

      // React testing userEvent library doesn't seem to work here
      span.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );

      await expect(selectPromise).resolves.toEqual({
        parent: null,
        // Can infer span because it's the only one under the root
        selectors: ["span"],
        tagName: "SPAN",
      });
    },
  );

  test("can select multiple in single root", async () => {
    document.body.innerHTML =
      '<div><span id="span1"">hello</span><span id="span2">goodbye</span></div>';

    const selectPromise = selectElement({
      mode: "element",
      root: "div",
      isMulti: true,
    });

    const args = showSelectionToolPopoverMock.mock.calls[0]![0];

    const selectionHandlerMock = jest.fn();

    args.setSelectionHandler(selectionHandlerMock);

    // React testing userEvent library doesn't seem to work here
    document
      .querySelector("#span1")!
      .dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    document
      .querySelector("#span2")!
      .dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );

    expect(selectionHandlerMock).toHaveBeenCalledTimes(2);

    args.onDone();

    await expect(selectPromise).resolves.toEqual({
      parent: null,
      isMulti: true,
      // Can infer span because it's the only one under the root
      selectors: ["span"],
      tagName: "SPAN",
    });
  });

  test("can expand selector", async () => {
    // The `div` needs to have a stable selector for expandedCssSelector to consider it for grouping spans
    document.body.innerHTML =
      '<div id="root"><span id="span1"">hello</span><span id="span2">goodbye</span><span id="span3">bon jour</span></div>';

    const selectPromise = selectElement({
      mode: "element",
      isMulti: true,
    });

    const args = showSelectionToolPopoverMock.mock.calls[0]![0];

    const selectionHandlerMock = jest.fn();

    args.setSelectionHandler(selectionHandlerMock);

    args.onChangeSimilarSelection(true);
    expect(selectionHandlerMock).toHaveBeenCalledTimes(1);

    // React testing userEvent library doesn't seem to work here
    document
      .querySelector("#span1")!
      .dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    document
      .querySelector("#span2")!
      .dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );

    expect(selectionHandlerMock).toHaveBeenCalledTimes(3);

    args.onDone();

    await expect(selectPromise).resolves.toEqual({
      parent: null,
      isMulti: true,
      selectors: ["#root span"],
      tagName: "SPAN",
    });
  });
});
