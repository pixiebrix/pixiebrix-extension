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

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ListGroup } from "react-bootstrap";
import ListItem from "./ListItem";
import { BlueprintListViewProps } from "@/options/pages/blueprints/blueprintsTypes";
import { VariableSizeList as List } from "react-window";
import ListGroupHeader from "@/options/pages/blueprints/listView/ListGroupHeader";
import { uuidv4 } from "@/types/helpers";

const ROW_HEIGHT_PX = 67;
const HEADER_ROW_HEIGHT_PX = 43;

const ListView: React.VoidFunctionComponent<BlueprintListViewProps> = ({
  tableInstance,
  height,
  width,
}) => {
  const [listKey, setListKey] = useState(uuidv4());

  const expandedRows = useMemo(
    () => tableInstance.rows.flatMap((row) => [row, ...row.subRows]),
    [tableInstance.rows]
  );

  const getItemSize = useCallback(
    (index: number) => {
      // eslint-disable-next-line security/detect-object-injection
      const row = expandedRows[index];
      return row.isGrouped ? HEADER_ROW_HEIGHT_PX : ROW_HEIGHT_PX;
    },
    [expandedRows]
  );

  // `react-window` caches itemSize which causes inconsistent
  // row heights/row height flickering on scroll when data changes,
  // even with non-index `itemKeys`.
  // Re-render the list when expandedRows changes.
  useEffect(() => {
    setListKey(uuidv4());
  }, [expandedRows]);

  return (
    <ListGroup {...tableInstance.getTableProps()}>
      <List
        height={height}
        width={width}
        itemCount={expandedRows.length}
        itemSize={getItemSize}
        key={listKey}
      >
        {({ index, style }) => {
          // eslint-disable-next-line security/detect-object-injection
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
