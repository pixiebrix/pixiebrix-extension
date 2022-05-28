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

import nytimes from "@contrib/blocks/nytimes-org.yaml";
import trelloReader from "@contrib/readers/trello-card-reader.yaml";
import { fromJS } from "@/blocks/transformers/blockFactory";
import { InvalidDefinitionError } from "@/errors/businessErrors";

test("two plus two is four", () => {
  expect(2 + 2).toBe(4);
});

test("can read yaml fixture", () => {
  expect(nytimes.kind).toBe("component");
});

test("can read nytimes articles", async () => {
  const block = fromJS(nytimes);
  expect(block.id).toBe("nytimes/organization-articles");
});

test("can read trello reader", async () => {
  const block = fromJS(trelloReader);
  expect(block.id).toBe("trello/card");
});

test("reader includes version", async () => {
  const block = fromJS(trelloReader);
  expect(block.version).toBe("0.0.1");
});

test("block includes version", async () => {
  const block = fromJS(nytimes);
  expect(block.version).toBe("0.0.1");
});

test("reject invalid fixture fixture", async () => {
  try {
    fromJS({ foo: "bar" });
  } catch (error) {
    expect(error).toBeInstanceOf(InvalidDefinitionError);
  }
});
