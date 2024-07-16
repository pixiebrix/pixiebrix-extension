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

import { BRICK_RESULT_COLUMN_COUNT } from "@/pageEditor/modals/addBrickModal/addBrickModalConstants";
import { type RegistryId } from "@/types/registryTypes";
import { type ItemKeyInput } from "@/pageEditor/modals/addBrickModal/addBrickModalTypes";
import { assertNotNullish } from "@/utils/nullishUtils";

export function getFlatArrayIndex({
  rowIndex,
  columnIndex,
}: {
  rowIndex: number;
  columnIndex: number;
}): number {
  // Layout items in the grid left to right, top to bottom
  return rowIndex * BRICK_RESULT_COLUMN_COUNT + columnIndex;
}

// We need to provide an item key because we reorder elements on search
// (See: https://react-window.vercel.app/#/api/FixedSizeGrid)
// Here, we use the brick id as the key, which is the "value" prop on the search result option
export function getItemKey({
  columnIndex,
  data: { brickOptions },
  rowIndex,
}: ItemKeyInput): RegistryId | number {
  const resultIndex = getFlatArrayIndex({ rowIndex, columnIndex });
  // Number of bricks for the last Grid row could be less than the number of columns
  // Returning the index here, ItemRenderer will render an empty cell
  if (resultIndex >= brickOptions.length) {
    return resultIndex;
  }

  const key = brickOptions.at(resultIndex)?.value;

  assertNotNullish(key, `Item key at resultIndex: ${resultIndex} is nullish`);

  return key;
}
