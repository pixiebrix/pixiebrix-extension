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
import { Card, Table } from "react-bootstrap";
import TableRow from "./TableRow";
import { getUniqueId } from "@/options/pages/blueprints/installableUtils";
import { BlueprintListViewProps } from "@/options/pages/blueprints/blueprintsTypes";

const TableView: React.VoidFunctionComponent<BlueprintListViewProps> = ({
  tableInstance,
  rows,
}) => (
  <Card>
    <Table {...tableInstance.getTableProps()}>
      <tbody {...tableInstance.getTableBodyProps()}>
        {rows.map((row) => {
          tableInstance.prepareRow(row);

          return (
            <TableRow
              key={getUniqueId(row.original.installable)}
              installableItem={row.original}
            />
          );
        })}
      </tbody>
    </Table>
  </Card>
);

export default TableView;
