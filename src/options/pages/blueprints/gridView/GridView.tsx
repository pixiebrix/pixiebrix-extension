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

import React, { useMemo } from "react";
import {
  BlueprintListViewProps,
  InstallableViewItem,
} from "@/options/pages/blueprints/blueprintsTypes";
import { FixedSizeGrid as Grid } from "react-window";
import { FixedSizeList as List } from "react-window";
import GridCard from "./GridCard";
import { expandRows } from "@/options/pages/blueprints/listView/ListView";
import { Row } from "react-table";
import ListGroupHeader from "@/options/pages/blueprints/listView/ListGroupHeader";

// TODO: refactor with just Rows, it will be more legible and efficient
function expandGridRows(
  rows: Array<Row<InstallableViewItem>>,
  columnCount: number
) {
  const gridRows = [];
  let nextGridRow = [];
  for (const row of rows) {
    if (row.isGrouped) {
      if (nextGridRow.length > 0) {
        gridRows.push(nextGridRow);
        nextGridRow = [];
      }

      gridRows.push(row);
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
  const expandedRows = useMemo(() => expandRows(rows), [rows]);

  // 200px card width & height, 15px padding
  const minCardSizeInPixels = 215;

  const columnCount = useMemo(() => {
    return Math.floor(width / minCardSizeInPixels);
  }, [width]);

  const expandedGridRows = useMemo(
    () => expandGridRows(expandedRows, columnCount),
    [columnCount, expandedRows]
  );
  console.log("expanded grid rows:", expandedGridRows);

  return (
    <div>
      <List
        height={height}
        width={width}
        itemSize={minCardSizeInPixels}
        itemCount={expandedGridRows.length}
      >
        {({ index, style }) => {
          const gridRow = expandedGridRows[index];

          if (gridRow.isGrouped) {
            tableInstance.prepareRow(gridRow);
            return (
              <ListGroupHeader groupName={gridRow.groupByVal} style={style} />
            );
          }

          return (
            <div style={style} className={styles.root}>
              {gridRow.map((row) => {
                tableInstance.prepareRow(row);
                return <GridCard key={row.id} installableItem={row.original} />;
              })}
            </div>
          );
        }}
      </List>
    </div>
  );
};

export default GridView;
