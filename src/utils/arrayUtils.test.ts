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

import { createLookupMap } from "@/utils/arrayUtils";

describe("createLookupMap", () => {
  it("should create a lookup map using object keys", () => {
    const data = [
      { id: "1", value: "a" },
      { id: "2", value: "b" },
      { id: "3", value: "c" },
    ];

    const lookupMap = createLookupMap(data, "id");

    expect(lookupMap.get("1")).toEqual({ id: "1", value: "a" });
    expect(lookupMap.get("2")).toEqual({ id: "2", value: "b" });
    expect(lookupMap.get("3")).toEqual({ id: "3", value: "c" });
  });

  it("should create a lookup map using a getter function", () => {
    const data = [
      { id: "1", value: "a" },
      { id: "2", value: "b" },
      { id: "3", value: "c" },
    ];

    const lookupMap = createLookupMap(data, (obj) => obj.id);

    expect(lookupMap.get("1")).toEqual({ id: "1", value: "a" });
    expect(lookupMap.get("2")).toEqual({ id: "2", value: "b" });
    expect(lookupMap.get("3")).toEqual({ id: "3", value: "c" });
  });

  it("should create a lookup map using a transforming getter function", () => {
    const data = [
      { id: "1", value: "a" },
      { id: "2", value: "b" },
      { id: "3", value: "c" },
    ];

    const lookupMap = createLookupMap(data, (obj) => `transformed-${obj.id}`);

    expect(lookupMap.get("transformed-1")).toEqual({ id: "1", value: "a" });
    expect(lookupMap.get("transformed-2")).toEqual({ id: "2", value: "b" });
    expect(lookupMap.get("transformed-3")).toEqual({ id: "3", value: "c" });
  });

  it("should return an empty map for an empty input array", () => {
    const lookupMap = createLookupMap([], "id");
    expect(lookupMap.size).toEqual(0);
  });
});
