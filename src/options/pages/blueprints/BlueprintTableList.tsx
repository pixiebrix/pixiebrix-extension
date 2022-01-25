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

import { Card, Table } from "react-bootstrap";
import styles from "@/options/pages/blueprints/BlueprintsList.module.scss";
import BlueprintTableRow from "@/options/pages/blueprints/BlueprintTableRow";
import { getUniqueId } from "@/options/pages/blueprints/installableUtils";
import React from "react";

const BlueprintTableList: React.FunctionComponent<{
  tableInstance;
  rows;
}> = ({ tableInstance, rows }) => {
  console.log("Rows:", rows);
  return (
    <Card className={styles.root}>
      <Table {...tableInstance.getTableProps()}>
        <tbody {...tableInstance.getTableBodyProps()}>
          {rows.map((row) => {
            tableInstance.prepareRow(row);

            return (
              <BlueprintTableRow
                key={getUniqueId(row.original.installable)}
                installableRow={row}
              />
            );
          })}
        </tbody>
      </Table>
    </Card>
  );
};

export default BlueprintTableList;
