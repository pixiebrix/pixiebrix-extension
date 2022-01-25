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
import BlueprintListEntry from "@/options/pages/blueprints/BlueprintListEntry";
import { getUniqueId } from "@/options/pages/blueprints/installableUtils";
import React, { useMemo } from "react";
import cx from "classnames";

const BlueprintsList: React.FunctionComponent<{
  tableInstance;
  rows;
}> = ({ tableInstance, rows }) => (
  <Card className={styles.root}>
    <Table {...tableInstance.getTableProps()}>
      <tbody {...tableInstance.getTableBodyProps()}>
        {rows.map((row) => {
          tableInstance.prepareRow(row);

          return (
            <BlueprintListEntry
              key={getUniqueId(row.values.installable)}
              installableRow={row}
            />
          );
        })}
      </tbody>
    </Table>
  </Card>
);

export default BlueprintsList;
