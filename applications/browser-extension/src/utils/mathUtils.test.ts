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

import { snapWithin } from "./mathUtils";

describe("snapWithin", () => {
  const outerBox = { x: 0, y: 0, width: 100, height: 100 };

  it.each([
    [
      "fully within",
      { x: 10, y: 10, width: 20, height: 20 },
      {
        x: 10,
        y: 10,
        width: 20,
        height: 20,
        top: 10,
        left: 10,
        bottom: 30,
        right: 30,
      },
    ],
    [
      "partially outside from top",
      { x: 10, y: -10, width: 20, height: 20 },
      {
        x: 10,
        y: 0,
        width: 20,
        height: 10,
        top: 0,
        left: 10,
        bottom: 10,
        right: 30,
      },
    ],
    [
      "partially outside from bottom",
      { x: 10, y: 90, width: 20, height: 20 },
      {
        x: 10,
        y: 90,
        width: 20,
        height: 10,
        top: 90,
        left: 10,
        bottom: 100,
        right: 30,
      },
    ],
    [
      "partially outside from left",
      { x: -10, y: 10, width: 20, height: 20 },
      {
        x: 0,
        y: 10,
        width: 10,
        height: 20,
        top: 10,
        left: 0,
        bottom: 30,
        right: 10,
      },
    ],
    [
      "partially outside from right",
      { x: 90, y: 10, width: 20, height: 20 },
      {
        x: 90,
        y: 10,
        width: 10,
        height: 20,
        top: 10,
        left: 90,
        bottom: 30,
        right: 100,
      },
    ],
    [
      "fully outside with overlapping edge",
      { x: 0, y: 120, width: 20, height: 20 },
      {
        x: 0,
        y: 100,
        width: 20,
        height: 0,
        top: 100,
        left: 0,
        bottom: 100,
        right: 20,
      },
    ],
    [
      "fully outside with no overlapping edge",
      { x: 120, y: 120, width: 20, height: 20 },
      {
        x: 100,
        y: 100,
        width: 0,
        height: 0,
        top: 100,
        left: 100,
        bottom: 100,
        right: 100,
      },
    ],
  ])("%s", (_, innerBox, expected) => {
    const result = snapWithin(innerBox, outerBox);
    expect(result).toEqual(expected);
  });
});
