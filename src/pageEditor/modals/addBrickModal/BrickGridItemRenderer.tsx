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

import React, { type CSSProperties } from "react";
import BrickGridItem from "@/pageEditor/modals/addBrickModal/BrickGridItem";
import { type BrickGridData } from "./addBrickModalTypes";
import { getFlatArrayIndex } from "@/pageEditor/modals/addBrickModal/addBrickModalHelpers";

type ItemRendererProps = {
  columnIndex: number;
  rowIndex: number;
  style: CSSProperties;
  data: BrickGridData;
};

// The item renderer must be its own separate component to react-window from re-mounting the results
// https://github.com/bvaughn/react-window/issues/420#issuecomment-585813335
const BrickGridItemRenderer: React.VFC<ItemRendererProps> = ({
  columnIndex,
  rowIndex,
  style,
  data: { brickOptions, invalidBrickMessages, onSetDetailBrick, onSelectBrick },
}) => {
  const index = getFlatArrayIndex({ rowIndex, columnIndex });
  const blockResult = brickOptions.at(index)?.brickResult;

  return (
    <div style={style}>
      {blockResult && (
        <BrickGridItem
          brick={blockResult}
          onSelect={() => {
            onSelectBrick(blockResult);
          }}
          onShowDetail={() => {
            onSetDetailBrick(blockResult);
          }}
          invalidMessage={invalidBrickMessages.get(blockResult.id)}
        />
      )}
    </div>
  );
};

export default BrickGridItemRenderer;
