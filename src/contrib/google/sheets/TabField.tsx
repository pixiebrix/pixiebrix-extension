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

import React, { useEffect, useMemo } from "react";
import { type SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { useAsyncState } from "@/hooks/common";
import { sheets } from "@/background/messenger/api";
import { type Expression, type Schema } from "@/core";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { isEmpty } from "lodash";
import { useField } from "formik";
import { getErrorMessage } from "@/errors/errorHelpers";
import { isExpression, isTemplateExpression } from "@/runtime/mapArgs";
import { useOnChangeEffect } from "@/contrib/google/sheets/useOnChangeEffect";
import { makeTemplateExpression } from "@/runtime/expressionCreators";

const TabField: React.FC<SchemaFieldProps & { spreadsheetId: string }> = ({
  name,
  spreadsheetId,
}) => {
  const [
    { value: tabNameValue },
    ,
    { setValue: setTabNameValue, setError: setTabNameError },
  ] = useField<string | Expression>(name);

  const [tabNames, loading, error] = useAsyncState(
    async () => {
      if (spreadsheetId) {
        return sheets.getTabNames(spreadsheetId);
      }

      return [];
    },
    [spreadsheetId],
    []
  );

  // Clear tab name when spreadsheetId changes, if the current value is not
  // an expression, which means it is a selected tab name from another sheet.
  useOnChangeEffect(spreadsheetId, (newValue: string, oldValue: string) => {
    // `spreadsheetId` is null when useAsyncState is loading
    if (oldValue == null) {
      return;
    }

    if (!isTemplateExpression(tabNameValue)) {
      setTabNameValue(makeTemplateExpression("nunjucks", ""));
    }
  });

  // If we've loaded tab names and the tab name is not set, set it to the first tab name.
  // Check to make sure there's not an error, so we're not setting it to the first value
  // of a stale list of tabs, and check the tab name value itself to prevent an infinite
  // re-render loop here.
  useEffect(() => {
    if (loading || error || isEmpty(tabNames)) {
      return;
    }

    if (
      !tabNameValue ||
      (isExpression(tabNameValue) && isEmpty(tabNameValue.__value__))
    ) {
      setTabNameValue(tabNames[0]);
    }
  }, [error, loading, setTabNameValue, tabNameValue, tabNames]);

  const fieldSchema = useMemo<Schema>(
    () => ({
      type: "string",
      title: "Tab Name",
      description: "The spreadsheet tab",
      enum: tabNames ?? [],
    }),
    [tabNames]
  );

  useEffect(
    () => {
      if (!loading && error) {
        setTabNameError("Error loading tab names: " + getErrorMessage(error));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Formik setters change on every render
    [error, loading]
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
