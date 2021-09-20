/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { DataTable as RawDataTable } from "primereact/datatable";
import { Column, ColumnProps } from "primereact/column";
import React from "react";

import theme from "primereact/resources/themes/saga-blue/theme.css?loadAsUrl";
import primereact from "primereact/resources/primereact.min.css?loadAsUrl";

const DataTableComponent: React.FunctionComponent<{
  columns: ColumnProps[];
  rows: Array<Record<string, unknown>>;
}> = ({ columns, rows }) => (
  <React.Fragment>
    <link rel="stylesheet" href={theme} />
    <link rel="stylesheet" href={primereact} />
    <RawDataTable value={rows}>
      {columns.map((column) => (
        <Column key={column.field} {...column} />
      ))}
    </RawDataTable>
  </React.Fragment>
);

export default DataTableComponent;
