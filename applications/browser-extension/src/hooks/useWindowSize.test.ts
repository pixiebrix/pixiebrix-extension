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

import { act, renderHook } from "@testing-library/react-hooks";
import { useWindowSize } from "./useWindowSize";

// Simulate window resize event: https://gist.github.com/javierarques/d95948ac7e9ddc8097612866ecc63a4b#file-jsdom-helper-js
const resizeEvent = document.createEvent("Event");
resizeEvent.initEvent("resize", true, true);

global.window.resizeTo = (width, height) => {
  global.window.innerWidth = width || global.window.innerWidth;
  global.window.innerHeight = height || global.window.innerHeight;
  global.window.dispatchEvent(resizeEvent);
};

test("watch for resize", async () => {
  const { result } = renderHook(() => useWindowSize());

  expect(result.current).toStrictEqual({
    height: 768,
    width: 1024,
  });

  await act(async () => {
    window.resizeTo(100, 100);
  });

  expect(result.current).toStrictEqual({
    height: 100,
    width: 100,
  });
});
