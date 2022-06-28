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

import { IBlock, RegistryId } from "@/core";

export const TAG_ALL = "All Categories";
export const BLOCK_RESULT_COLUMN_COUNT = 2;
export const POPULAR_BRICK_TAG_ID = "35367896-b38f-447e-9444-ecfecb258468";

export type BlockResult = IBlock & {
  isPopular?: boolean;
};

export type BlockOption = {
  blockResult: BlockResult;
  value: RegistryId;
  label: string;
};

export type BlockGridData = {
  blockOptions: BlockOption[];
  onSetDetailBlock: (block: IBlock) => void;
  onSelectBlock: (block: IBlock) => void;
};

export function getFlatArrayIndex(
  rowIndex: number,
  columnIndex: number
): number {
  // Layout items in the grid left to right, top to bottom
  return rowIndex * BLOCK_RESULT_COLUMN_COUNT + columnIndex;
}
