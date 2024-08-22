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

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { ListGroup } from "react-bootstrap";
import ListItem from "./ListItem";
import { VariableSizeList as List } from "react-window";
import ListGroupHeader from "@/extensionConsole/pages/mods/listView/ListGroupHeader";
import ListItemErrorBoundary from "@/extensionConsole/pages/mods/listView/ListItemErrorBoundary";
import { type ModsPageContentProps } from "@/extensionConsole/pages/mods/modsPageTypes";
import { assertNotNullish } from "@/utils/nullishUtils";

const ROW_HEIGHT_PX = 90;
const HEADER_ROW_HEIGHT_PX = 43;

const ListView: React.VoidFunctionComponent<ModsPageContentProps> = ({
  tableInstance,
  height,
  width,
}) => {
  const listRef = useRef<List>();

  const expandedRows = useMemo(
    () => tableInstance.rows.flatMap((row) => [row, ...row.subRows]),
    [tableInstance.rows],
  );

  const getItemSize = useCallback(
    (index: number) => {
      const row = expandedRows.at(index);
      assertNotNullish(row, `Unable to find row at index ${index}`);
      return row.isGrouped ? HEADER_ROW_HEIGHT_PX : ROW_HEIGHT_PX;
    },
    [expandedRows],
  );

  // Re-render the list when expandedRows changes.
  useEffect(() => {
    listRef.current?.resetAfterIndex(0);
  }, [expandedRows]);

  return (
    <ListGroup {...tableInstance.getTableProps()}>
      <List
        height={height}
        width={width}
        itemCount={expandedRows.length}
        itemSize={getItemSize}
        ref={listRef}
      >
        {({ index, style }) => {
          const row = expandedRows.at(index);
          assertNotNullish(row, `Unable to find row at index ${index}`);
          tableInstance.prepareRow(row);

          return row.isGrouped ? (
            <ListGroupHeader groupName={row.groupByVal} style={style} />
          ) : (
            <ListItemErrorBoundary modViewItem={row.original} style={style}>
              <ListItem modViewItem={row.original} style={style} />
            </ListItemErrorBoundary>
          );
        }}
      </List>
    </ListGroup>
  );
};

export default ListView;
