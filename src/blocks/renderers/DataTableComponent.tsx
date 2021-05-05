/*
 * Copyright (C) 2021 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { DataTable as RawDataTable } from "primereact/datatable";
import { Column, ColumnProps } from "primereact/column";
import React from "react";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const theme = require("!!raw-loader!primereact/resources/themes/saga-blue/theme.css?esModule=false")
  .default;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const primereact = require("!!raw-loader!primereact/resources/primereact.min.css?esModule=false")
  .default;

const DataTableComponent: React.FunctionComponent<{
  columns: ColumnProps[];
  rows: object[];
}> = ({ columns, rows }) => {
  return (
    <React.Fragment>
      <style
        type="text/css"
        dangerouslySetInnerHTML={{ __html: theme.toString() }}
      />
      <style
        type="text/css"
        dangerouslySetInnerHTML={{ __html: primereact.toString() }}
      />
      <RawDataTable value={rows}>
        {columns.map((column) => (
          <Column key={column.field} {...column} />
        ))}
      </RawDataTable>
    </React.Fragment>
  );
};

export default DataTableComponent;
