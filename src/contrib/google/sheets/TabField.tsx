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

import React, { useMemo } from "react";
import { type SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { useAsyncState } from "@/hooks/common";
import { sheets } from "@/background/messenger/api";
import { type Schema } from "@/core";
import SchemaField from "@/components/fields/schemaFields/SchemaField";

const TabField: React.FC<SchemaFieldProps & { spreadsheetId: string }> = ({
  name,
  spreadsheetId,
}) => {
  const [tabNames] = useAsyncState(async () => {
    if (spreadsheetId) {
      return sheets.getTabNames(spreadsheetId);
    }

    return [];
  }, [spreadsheetId]);

  const fieldSchema = useMemo<Schema>(
    () => ({
      type: "string",
      title: "Tab Name",
      description: "The spreadsheet tab",
      enum: tabNames ?? [],
    }),
    [tabNames]
  );

  // TODO: re-add info message that tab will be created
  // {!tabsPending &&
  // !isNullOrBlank(field.value) &&
  // !tabNames.includes(field.value) &&
  // doc != null && (
  //   <span className="text-info small">
  //           Tab does not exist in the sheet, it will be created
  //         </span>
  // )}

  return (
    <SchemaField
      name={name}
      schema={fieldSchema}
      isRequired
      defaultType="select"
    />
  );
};

export default TabField;
