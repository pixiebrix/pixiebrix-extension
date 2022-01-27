/* eslint-disable filenames/match-exported */
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

import { BusinessError } from "@/errors";
import { UnknownObject } from "@/types";
import { SafeHTML } from "@/core";
import sanitize from "@/utils/sanitize";

// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style -- Record<> doesn't allow labelled keys
export interface Row {
  [column: string]: unknown;
}

export interface ColumnDefinition<TRow extends Row> {
  property: string;
  label: string;
  renderer?: (value: any, row: TRow) => string;
}

function renderValue<TRow extends Row>(
  column: ColumnDefinition<TRow>,
  row: TRow
) {
  const renderer = column.renderer ?? ((value) => String(value));
  const value = Object.prototype.hasOwnProperty.call(row, column.property)
    ? row[column.property]
    : null;
  return renderer(value, row);
}

function renderRow<TRow extends Row>(
  columns: Array<ColumnDefinition<TRow>>,
  row: TRow
) {
  const columnHTML = columns
    .map((column) => `<td>${renderValue(column, row)}</td>`)
    .join("");
  return `<tr>${columnHTML}</tr>`;
}

const style = `
<style>
table.blueTable {
  border: 1px solid #1C6EA4;
  background-color: #EEEEEE;
  width: 100%;
  text-align: left;
  border-collapse: collapse;
}
table.blueTable td, table.blueTable th {
  border: 1px solid #AAAAAA;
  padding: 3px 2px;
}
table.blueTable tbody td {
  font-size: 13px;
}
table.blueTable tr:nth-child(even) {
  background: #D0E4F5;
}
table.blueTable thead {
  background: #1C6EA4;
  background: -moz-linear-gradient(top, #5592bb 0%, #327cad 66%, #1C6EA4 100%);
  background: -webkit-linear-gradient(top, #5592bb 0%, #327cad 66%, #1C6EA4 100%);
  background: linear-gradient(to bottom, #5592bb 0%, #327cad 66%, #1C6EA4 100%);
  border-bottom: 2px solid #444444;
}
table.blueTable thead th {
  font-size: 15px;
  font-weight: bold;
  color: #FFFFFF;
  border-left: 2px solid #D0E4F5;
}
table.blueTable thead th:first-child {
  border-left: none;
}

table.blueTable tfoot {
  font-size: 14px;
  font-weight: bold;
  color: #FFFFFF;
  background: #D0E4F5;
  background: -moz-linear-gradient(top, #dcebf7 0%, #d4e6f6 66%, #D0E4F5 100%);
  background: -webkit-linear-gradient(top, #dcebf7 0%, #d4e6f6 66%, #D0E4F5 100%);
  background: linear-gradient(to bottom, #dcebf7 0%, #d4e6f6 66%, #D0E4F5 100%);
  border-top: 2px solid #444444;
}
table.blueTable tfoot td {
  font-size: 14px;
}
table.blueTable tfoot .links {
  text-align: right;
}
table.blueTable tfoot .links a{
  display: inline-block;
  background: #1C6EA4;
  color: #FFFFFF;
  padding: 2px 8px;
  border-radius: 5px;
}
</style>
`;

function makeDataTable<TRow extends UnknownObject>(
  columns: Array<ColumnDefinition<TRow>>
): (ctxt: unknown) => SafeHTML {
  return (ctxt: unknown): SafeHTML => {
    if (!Array.isArray(ctxt)) {
      throw new BusinessError("makeDataTable expected an array of data");
    }

    const rawTable = `
         <table class="blueTable">
            <thead>
            <tr>
                ${columns.map((x) => `<th>${x.label}</th>`).join("\n")}
            </tr>
            </thead>
            <tbody>
                ${ctxt.map((row) => renderRow(columns, row)).join("\n")}
            </tbody>
        </table>
    `;

    return `
        ${style}
        ${sanitize(rawTable)}
    ` as SafeHTML;
  };
}

export default makeDataTable;
