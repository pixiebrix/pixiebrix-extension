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

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { ListGroup } from "react-bootstrap";
import ListItem from "./ListItem";
import {
  BlueprintListViewProps,
  InstallableViewItem,
} from "@/options/pages/blueprints/blueprintsTypes";
import { VariableSizeList as List } from "react-window";
import ListGroupHeader from "@/options/pages/blueprints/listView/ListGroupHeader";
import { Row } from "react-table";

// Expands react-table grouped rows recursively, as
// compensation for react-tables instance property flatRows,
// which is depth-first
export function expandRows(
  rows: Array<Row<InstallableViewItem>>
): Array<Row<InstallableViewItem>> {
  const flatRows = [];
  for (const row of rows) {
    flatRows.push(row);

    if (row.isGrouped) {
      flatRows.push(...expandRows(row.subRows));
    }
  }

  return flatRows;
}

const ListView: React.VoidFunctionComponent<BlueprintListViewProps> = ({
  tableInstance,
  rows,
  height,
  width,
}) => {
  const rowSizeInPixels = 67;
  const headerSizeInPixels = 43;

  // This ref is required in order to update row height upon
  // data change (assigning a unique itemKey does not work in this case)
  // see https://github.com/bvaughn/react-window/issues/199#issuecomment-479957451
  const listRef = useRef();

  const expandedRows = useMemo(() => expandRows(rows), [rows]);

  const getItemSize = useCallback(
    (index: number) => {
      const row = expandedRows[index];
      return row.isGrouped ? headerSizeInPixels : rowSizeInPixels;
    },
    [expandedRows]
  );

  useEffect(() => {
    listRef.current.resetAfterIndex(0, false);
  }, [expandedRows]);

  return (
    <ListGroup {...tableInstance.getTableProps()}>
      <List
        height={height}
        width={width}
        itemCount={expandedRows.length}
        // Arbitrary number that fits content aesthetically
        itemSize={getItemSize}
        ref={listRef}
      >
        {({ index, style }) => {
          const row = expandedRows[index];
          tableInstance.prepareRow(row);

          return row.isGrouped ? (
            <ListGroupHeader groupName={row.groupByVal} style={style} />
          ) : (
            <ListItem installableItem={row.original} style={style} />
          );
        }}
      </List>
    </ListGroup>
  );
};

export default ListView;
