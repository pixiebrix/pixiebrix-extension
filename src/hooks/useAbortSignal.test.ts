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

import { renderHook } from "@testing-library/react";
import useAbortSignal from "./useAbortSignal";

it("returns the initial state of the signal", () => {
  const active = renderHook(() => useAbortSignal(new AbortController().signal));
  expect(active.result.current).toBe(false);

  const aborted = renderHook(() => useAbortSignal(AbortSignal.abort()));
  expect(aborted.result.current).toBe(true);
});

it("updates the state when the signal is aborted", () => {
  const controller = new AbortController();
  const { result } = renderHook(() => useAbortSignal(controller.signal));
  expect(result.current).toBe(false);

  controller.abort();
  expect(result.current).toBe(true);
});
