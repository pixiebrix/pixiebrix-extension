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

import { SimpleEventTarget } from "./SimpleEventTarget";

describe("SimpleEventTarget", () => {
  test("add and remove multiple", () => {
    const target = new SimpleEventTarget();
    const callback = jest.fn();
    const callback2 = jest.fn();
    target.add(callback);
    target.add(callback2);
    target.add(callback);
    target.emit();
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledTimes(1);

    target.remove(callback);
    target.emit();
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledTimes(2);

    target.remove(callback2);
    target.emit();
    expect(callback2).toHaveBeenCalledTimes(2);
  });
  test("pass details", () => {
    const target = new SimpleEventTarget();
    const callback = jest.fn();
    target.add(callback);
    target.emit("foo");
    expect(callback).toHaveBeenCalledWith("foo");
  });
});
