/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import getElementCollectionName from "@/components/documentBuilder/edit/getElementCollectionName";

test("returns collection name for an element", () => {
  const elementName = "body.0.children.3";
  const { collectionName, elementIndex } = getElementCollectionName(
    elementName
  );
  expect(collectionName).toBe("body.0.children");
  expect(elementIndex).toBe(3);
});

test("works for root element", () => {
  const elementName = "body.5";
  const { collectionName, elementIndex } = getElementCollectionName(
    elementName
  );
  expect(collectionName).toBe("body");
  expect(elementIndex).toBe(5);
});

test("works for list element", () => {
  const elementName = "body.5.children.3.config.element.__value__";
  const { collectionName, elementIndex } = getElementCollectionName(
    elementName
  );

  // Name of list element collection points to the collection of the list itself
  expect(collectionName).toBe("body.5.children");
  expect(elementIndex).toBe(3);
});
