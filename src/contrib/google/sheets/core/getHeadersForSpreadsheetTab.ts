/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { type Spreadsheet } from "@/contrib/google/sheets/core/types";
import { type Expression } from "@/types/runtimeTypes";
import { isExpression } from "@/utils/expressionUtils";

export default function getHeadersForSpreadsheetTab(
  spreadsheet: Spreadsheet | null,
  tabName: string | Expression
): string[] {
  if (!spreadsheet) {
    return [];
  }

  const rawTabName = isExpression(tabName) ? tabName.__value__ : tabName;
  const sheet = spreadsheet.sheets?.find(
    (sheet) => sheet.properties.title === rawTabName
  );
  return (
    sheet?.data?.[0]?.rowData?.[0]?.values?.map(
      (value) => value.formattedValue
    ) ?? []
  );
}
