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

import React from "react";
import { ListGroup } from "react-bootstrap";
import ListItem from "./ListItem";
import { BlueprintListViewProps } from "@/options/pages/blueprints/blueprintsTypes";
import { FixedSizeList as List } from "react-window";

const ListView: React.VoidFunctionComponent<BlueprintListViewProps> = ({
  tableInstance,
  rows,
  height,
  width,
}) => (
  <ListGroup {...tableInstance.getTableProps()}>
    <List
      height={height}
      width={width}
      itemCount={rows.length}
      // Arbitrary number that looks aesthetic
      itemSize={67}
    >
      {({ index, style }) => {
        const row = rows[index];
        tableInstance.prepareRow(row);

        return <ListItem installableItem={row.original} style={style} />;
      }}
    </List>
  </ListGroup>
);

export default ListView;
