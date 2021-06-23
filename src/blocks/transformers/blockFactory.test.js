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

import nytimes from "@contrib/blocks/nytimes-org.yaml";
import trelloReader from "@contrib/readers/trello-card-reader.yaml";
import { ValidationError } from "@/errors";
import { fromJS } from "@/blocks/transformers/blockFactory";

test("two plus two is four", () => {
  expect(2 + 2).toBe(4);
});

test("can read yaml fixture", () => {
  expect(nytimes.kind).toBe("component");
});

test("can read yaml fixture", async () => {
  const block = await fromJS(nytimes);
  expect(block.id).toBe("nytimes/organization-articles");
});

test("can read trello reader", async () => {
  const block = await fromJS(trelloReader);
  expect(block.id).toBe("trello/card");
});

test("reject invalid fixture fixture", async () => {
  try {
    await fromJS({ foo: "bar" });
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
  }
});
