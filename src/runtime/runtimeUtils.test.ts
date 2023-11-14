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

import { isApiVersionAtLeast } from "@/runtime/runtimeUtils";

describe("isApiVersionAtLeast()", () => {
  test("v2 is at least v1", () => {
    expect(isApiVersionAtLeast("v2", "v1")).toBe(true);
  });
  test("v2 is at least v2", () => {
    expect(isApiVersionAtLeast("v2", "v2")).toBe(true);
  });
  test("v3 is at least v1", () => {
    expect(isApiVersionAtLeast("v3", "v1")).toBe(true);
  });
  test("v1 is not at least v2", () => {
    expect(isApiVersionAtLeast("v1", "v2")).toBe(false);
  });
});
