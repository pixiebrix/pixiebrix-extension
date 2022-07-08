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

import React, { CSSProperties } from "react";
import BlockGridItem from "@/components/addBlockModal/BlockGridItem";
import { BlockGridData } from "./addBlockModalTypes";
import { getFlatArrayIndex } from "@/components/addBlockModal/addBlockModalHelpers";

type ItemRendererProps = {
  columnIndex: number;
  rowIndex: number;
  style: CSSProperties;
  data: BlockGridData;
};

// The item renderer must be its own separate component to react-window from re-mounting the results
// https://github.com/bvaughn/react-window/issues/420#issuecomment-585813335
const BlockGridItemRenderer: React.VFC<ItemRendererProps> = ({
  columnIndex,
  rowIndex,
  style,
  data: { blockOptions, onSetDetailBlock, onSelectBlock },
}) => {
  const index = getFlatArrayIndex(rowIndex, columnIndex);
  // eslint-disable-next-line security/detect-object-injection -- number index from function call
  const blockResult = blockOptions[index]?.blockResult;

  return (
    <div style={style}>
      {blockResult && (
        <BlockGridItem
          block={blockResult}
          onSelect={() => {
            onSelectBlock(blockResult);
          }}
          onShowDetail={() => {
            onSetDetailBlock(blockResult);
          }}
        />
      )}
    </div>
  );
};

export default BlockGridItemRenderer;
