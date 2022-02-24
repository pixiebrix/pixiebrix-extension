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

import styles from "./GridView.module.scss";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BlueprintListViewProps,
  InstallableViewItem,
} from "@/options/pages/blueprints/blueprintsTypes";
import { VariableSizeList as List } from "react-window";
import GridCard from "./GridCard";
import { Row } from "react-table";
import ListGroupHeader from "@/options/pages/blueprints/listView/ListGroupHeader";
import { uuidv4 } from "@/types/helpers";
import { getUniqueId } from "@/options/pages/blueprints/installableUtils";

// Expands react-table grouped rows recursively, and groups
// rows in chunks of `columnCount` for easy grid rendering
function expandGridRows(
  rows: Array<Row<InstallableViewItem>>,
  columnCount: number
): Array<Row<InstallableViewItem> | Array<Row<InstallableViewItem>>> {
  const gridRows = [];
  let nextGridRow = [];
  for (const row of rows) {
    if (row.isGrouped) {
      gridRows.push(row);

      if (nextGridRow.length > 0) {
        gridRows.push(nextGridRow);
        nextGridRow = [];
      }

      gridRows.push(...expandGridRows(row.subRows, columnCount));
      continue;
    }

    if (nextGridRow.length >= columnCount) {
      gridRows.push(nextGridRow);
      nextGridRow = [];
    }

    nextGridRow.push(row);
  }

  if (nextGridRow.length > 0) {
    gridRows.push(nextGridRow);
  }

  return gridRows;
}

const GridView: React.VoidFunctionComponent<BlueprintListViewProps> = ({
  tableInstance,
  rows,
  width,
  height,
}) => {
  // 200px min card width & height, 15px padding
  // see: GridView.module.scss
  const minCardSizeInPixels = 215;

  const [listKey, setListKey] = useState(uuidv4());

  const columnCount = useMemo(
    () => Math.floor(width / minCardSizeInPixels),
    [width]
  );

  const expandedGridRows = useMemo(
    () => expandGridRows(rows, columnCount),
    [columnCount, rows]
  );

  const getItemSize = useCallback(
    (index: number): number => {
      // eslint-disable-next-line security/detect-object-injection
      const row = expandedGridRows[index];
      return "isGrouped" in row ? 43 : minCardSizeInPixels;
    },
    [expandedGridRows]
  );

  useEffect(() => {
    setListKey(uuidv4);
  }, [expandedGridRows, columnCount]);

  const GridRow = useCallback(
    ({ index, style }) => {
      // eslint-disable-next-line security/detect-object-injection
      const gridRow = expandedGridRows[index];

      if ("isGrouped" in gridRow) {
        tableInstance.prepareRow(gridRow);

        return <ListGroupHeader groupName={gridRow.groupByVal} style={style} />;
      }

      return (
        <div style={style} className={styles.root}>
          {gridRow.map((row: Row<InstallableViewItem>) => {
            tableInstance.prepareRow(row);
            return (
              <GridCard
                key={getUniqueId(row.original.installable)}
                installableItem={row.original}
              />
            );
          })}
        </div>
      );
    },
    [expandedGridRows, tableInstance]
  );

  return (
    <List
      height={height}
      width={width}
      itemSize={getItemSize}
      itemCount={expandedGridRows.length}
      key={listKey}
    >
      {GridRow}
    </List>
  );
};

export default GridView;
