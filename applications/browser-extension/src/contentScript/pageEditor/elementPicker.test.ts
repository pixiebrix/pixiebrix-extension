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

import { userSelectElement } from "./elementPicker";
import { BusinessError } from "@/errors/businessErrors";
import showSelectionToolPopover from "@/components/selectionToolPopover/showSelectionToolPopover";

// Mock because the React vs. JSDOM event handling and dom manipulation isn't playing nicely together
jest.mock("../../components/selectionToolPopover/showSelectionToolPopover");

const showSelectionToolPopoverMock = jest.mocked(showSelectionToolPopover);

Element.prototype.scrollTo = jest.fn();

beforeEach(() => {
  showSelectionToolPopoverMock.mockClear();
});

describe("userSelectElement", () => {
  test("can select single element", async () => {
    document.body.innerHTML = "<div><span>hello</span></div>";

    const span = document.querySelector("span")!;

    const elementPromise = userSelectElement();

    // React testing userEvent library doesn't seem to work here
    span.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );

    await expect(elementPromise).resolves.toEqual({
      elements: [span],
      isMulti: false,
      shouldSelectSimilar: false,
    });
  });

  test("require element in root", async () => {
    document.body.innerHTML =
      '<div><div><span>hello</span></div><div id="root"></div></div>';

    const span = document.querySelector("span")!;

    const elementPromise = userSelectElement({
      roots: [...document.querySelectorAll("#root")] as HTMLElement[],
    });

    // React testing userEvent library doesn't seem to work here
    span.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );

    await expect(elementPromise).rejects.toThrow(BusinessError);
  });
});
