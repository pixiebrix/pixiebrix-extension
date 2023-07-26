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
import { useOnChangeEffect } from "@/contrib/google/sheets/core/useOnChangeEffect";
import { makeTemplateExpression } from "@/runtime/expressionCreators";
import { type Expression } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { isExpression, isTemplateExpression } from "@/utils/expressionUtils";
import { type Spreadsheet } from "@/contrib/google/sheets/core/types";

// Use a module constant for the sake of memo dependencies
const emptyTabNames: string[] = [];

const TabField: React.FC<
  SchemaFieldProps & { spreadsheet: Spreadsheet | null }
> = ({ name, spreadsheet }) => {
  const inputRef = useRef<HTMLTextAreaElement>();

  const [
    { value: tabName },
    ,
    { setValue: setTabName, setError: setTabNameError },
  ] = useField<string | Expression>(name);

  const tabNames =
    spreadsheet?.sheets?.map((sheet) => sheet.properties.title) ??
    emptyTabNames;
  const fieldSchema: Schema = {
    type: "string",
    title: "Tab Name",
    description: "The spreadsheet tab",
    enum: tabNames,
  };

  // Clear tab name when spreadsheetId changes, if the current value is not
  // an expression, which means it is a selected tab name from another sheet.
  useOnChangeEffect(spreadsheet?.spreadsheetId, () => {
    if (!isTemplateExpression(tabName)) {
      setTabName(makeTemplateExpression("nunjucks", ""));
      setTabNameError(null);
    }
  });

  // If we've loaded tab names and the tab name is not set, set it to the first tab name.
  // Check to make sure there's not an error, so we're not setting it to the first value
  // of a stale list of tabs, and check the tab name value itself to prevent an infinite
  // re-render loop here. Don't automatically modify the input if it's currently focused.
  useEffect(() => {
    if (isEmpty(tabNames) || document.activeElement === inputRef.current) {
      return;
    }

    if (!tabName || (isExpression(tabName) && isEmpty(tabName.__value__))) {
      setTabName(tabNames[0]);
      setTabNameError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- don't include formik helpers
  }, [tabName, tabNames]);

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
