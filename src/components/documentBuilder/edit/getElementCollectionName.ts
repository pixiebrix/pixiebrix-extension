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

import { assert } from "@/utils/typeUtils";

const elementsCollectionRegexp =
  /((?<collectionName>.*)\.)?(?<elementIndex>\d+)/;

/**
 * Returns the name of the collection of a document element.
 * Ex. for a given elementName `body.0.children.3` returns `body.0.children`
 */
function getElementCollectionName(elementName: string): {
  collectionName: string;
  elementIndex: number;
} {
  const match = elementsCollectionRegexp.exec(elementName)?.groups;

  assert(match, `Unable to parse the collection name in: ${elementName}`);

  return {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Guaranteed by the regexp
    collectionName: match.collectionName!,
    elementIndex: Number(match.elementIndex),
  };
}

export default getElementCollectionName;
