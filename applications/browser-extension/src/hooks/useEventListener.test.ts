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

import useEventListener from "./useEventListener";
import { renderHook } from "@/testUtils/renderWithCommonStore";

test("useEventListener", () => {
  const mockElement = document.createElement("div");
  const mockEvent = new Event("click");
  const mockHandler = jest.fn();

  renderHook(() => {
    useEventListener(mockElement, "click", mockHandler);
  });
  mockElement.dispatchEvent(mockEvent);

  expect(mockHandler).toHaveBeenCalledTimes(1);
  expect(mockHandler).toHaveBeenCalledWith(mockEvent);
});
