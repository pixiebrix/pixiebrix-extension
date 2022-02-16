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

import React, { useMemo } from "react";
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
function expandRows(
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
  const expandedRows = useMemo(() => {
    return expandRows(rows);
  }, [rows]);

  const getItemSize = (index: number) =>
    // Arbitrary numbers that look aesthetic
    expandedRows[index].isGrouped ? 43 : 67;

  return (
    <ListGroup {...tableInstance.getTableProps()}>
      <List
        height={height}
        width={width}
        itemCount={expandedRows.length}
        // Arbitrary number that looks aesthetic
        itemSize={getItemSize}
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
