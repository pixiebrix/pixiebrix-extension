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

  const allTabNames = tabNames.join(",");
  useEffect(
    () => {
      // Don't modify the field if it's currently focused
      if (document.activeElement === inputRef.current) {
        return;
      }

      // Don't modify if it's a non-empty expression (user-typed text, or variable)
      if (isExpression(tabName) && !isEmpty(tabName.__value__)) {
        return;
      }

      // Set to empty nunjucks expression if no tab names have loaded
      if (isEmpty(tabNames)) {
        setTabName(makeTemplateExpression("nunjucks", ""));
        return;
      }

      // Don't modify if the tab name is still valid
      if (typeof tabName === "string" && tabNames.includes(tabName)) {
        return;
      }

      // Remaining cases are either empty expression or invalid, selected tab name, so set to first tab name
      setTabName(tabNames[0]);
    },
    // We shouldn't include the setTabName formik helper due to unstable reference, the allTabNames string covers
    // the tabNames dependency, and we're setting tabName here so don't want to run this side effect when it changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spreadsheet?.spreadsheetId, allTabNames]
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
