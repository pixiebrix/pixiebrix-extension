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

import { SelectElement } from "@/blocks/transformers/selectElement";
import { userSelectElement } from "@/contentScript/pageEditor/elementPicker";
import { getReferenceForElement } from "@/contentScript/elementReference";
import { CancelError } from "@/errors/businessErrors";

jest.mock("@/contentScript/pageEditor/elementPicker", () => ({
  userSelectElement: jest.fn(),
}));

const userSelectElementMock = userSelectElement as jest.MockedFunction<
  typeof userSelectElement
>;

const brick = new SelectElement();

describe("selectElement", () => {
  it("should select element", async () => {
    document.body.innerHTML = "<div><button>Hello</button></div>";

    const elements = [...document.querySelectorAll("button")];

    userSelectElementMock.mockResolvedValue({
      elements,
      isMulti: false,
      shouldSelectSimilar: false,
    });

    const result = await brick.transform();

    expect(result).toEqual({
      elements: [getReferenceForElement(elements[0])],
    });
  });

  it("handle cancel error", async () => {
    document.body.innerHTML = "<div><button>Hello</button></div>";

    userSelectElementMock.mockRejectedValue(new CancelError());

    await expect(async () => brick.transform()).rejects.toThrow(CancelError);
  });
});
