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

import React, { useEffect, useRef } from "react";
import { type SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { isEmpty } from "lodash";
import { useField } from "formik";
import { makeTemplateExpression } from "@/runtime/expressionCreators";
import { type Expression } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { isExpression } from "@/utils/expressionUtils";
import { type Spreadsheet } from "@/contrib/google/sheets/core/types";

// Use a module constant for the sake of memo dependencies
const emptyTabNames: string[] = [];

const TabField: React.FC<
  SchemaFieldProps & { spreadsheet: Spreadsheet | null }
> = ({ name, spreadsheet }) => {
  const inputRef = useRef<HTMLTextAreaElement>();

  const [{ value: tabName }, , { setValue: setTabName }] = useField<
    string | Expression
  >(name);

  const tabNames =
    spreadsheet?.sheets?.map((sheet) => sheet.properties.title) ??
    emptyTabNames;
  const fieldSchema: Schema = {
    type: "string",
    title: "Tab Name",
    description: "The spreadsheet tab",
    enum: tabNames,
  };

  useEffect(
    () => {
      // Don't modify the field if it's currently focused
      if (document.activeElement === inputRef.current) {
        return;
      }

      // If tabName value is a string, that means it is a selected tab from a loaded spreadsheet
      if (!isExpression(tabName) && !isEmpty(tabName)) {
        if (isEmpty(tabNames)) {
          setTabName(makeTemplateExpression("nunjucks", ""));
        } else if (!tabNames.includes(tabName)) {
          setTabName(tabNames[0]);
        }
      }

      // Also set to the first tab if the field value is an empty expression or null (initial value)
      if (
        tabName == null ||
        (isExpression(tabName) && isEmpty(tabName.__value__))
      ) {
        setTabName(tabNames[0]);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tabNames are strings, and we're setting tabName
    [spreadsheet?.spreadsheetId, ...tabNames]
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
      inputRef={inputRef}
    />
  );
};

export default TabField;
