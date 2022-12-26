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
import { renderHook, act } from "@testing-library/react-hooks";
import useTimeoutState from "./useTimeoutState";

test("useTimeoutState", async () => {
  const { result } = renderHook(() => useTimeoutState(200));

  expect(result.current).toEqual(false);
  await act(async () => sleep(30));
  expect(result.current).toEqual(false);
  await act(async () => sleep(300));
  expect(result.current).toEqual(true);
});
