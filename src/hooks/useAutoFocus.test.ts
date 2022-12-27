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

import { sleep } from "@/utils";
import { renderHook } from "@testing-library/react-hooks";
import { act } from "react-dom/test-utils";
import useAutoFocus from "./useAutoFocus";

describe("useAutoFocus", () => {
  test("basic usage", async () => {
    const ref = { current: { focus: jest.fn() } };
    renderHook(() => {
      useAutoFocus(ref as any);
    });

    expect(ref.current.focus).toHaveBeenCalledOnce();
  });

  test("basic usage, disabled", async () => {
    const ref = { current: { focus: jest.fn() } };
    renderHook(() => {
      useAutoFocus(ref as any, false);
    });

    expect(ref.current.focus).not.toHaveBeenCalled();
  });

  test("timer usage", async () => {
    const ref = { current: { focus: jest.fn() } };
    renderHook(() => {
      useAutoFocus(ref as any, true, 100);
    });

    expect(ref.current.focus).not.toHaveBeenCalled();
    await act(async () => sleep(50));
    expect(ref.current.focus).not.toHaveBeenCalled();
    await act(async () => sleep(100));
    expect(ref.current.focus).toHaveBeenCalled();
  });
});
