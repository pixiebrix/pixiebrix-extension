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

import useScrollLock from "./useScrollLock";
import { renderHook } from "@/testUtils/renderWithCommonStore";

describe("useScrollLock", () => {
  const html = document.documentElement;
  it("should add scrollLocked class to document", () => {
    renderHook(() => {
      useScrollLock(true);
    });
    expect(html).toHaveClass("scrollLocked");
    expect(html).not.toHaveClass("hadScrollbar");
  });

  it("should remove scrollLocked class from document", () => {
    renderHook(() => {
      useScrollLock(false);
    });
    expect(html).not.toHaveClass("scrollLocked");
    expect(html).not.toHaveClass("h≈≈adScrollbar");
  });
});
