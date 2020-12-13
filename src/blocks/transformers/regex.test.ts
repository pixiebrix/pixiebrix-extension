/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { RegexTransformer } from "./regex";

const transformer = new RegexTransformer();

test("unmatched returns empty dict", async () => {
  const result = await transformer.transform({
    regex: "(?<name>ABC)",
    input: "XYZ",
  });
  expect(result).toEqual({});
});

test("matches name", async () => {
  const result = await transformer.transform({
    regex: "(?<name>ABC)",
    input: "ABC",
  });
  expect(result).toEqual({ name: "ABC" });
});

test("handle multiple", async () => {
  const result = await transformer.transform({
    regex: "(?<name>ABC)",
    input: ["ABC", "XYZ"],
  });
  expect(result).toEqual([{ name: "ABC" }, {}]);
});
