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

import React from "react";
import { type BlockOptionProps } from "@/components/fields/schemaFields/genericOptionsFactory";
import { useField } from "formik";
import { type Expression, type Schema } from "@/core";
import { joinName } from "@/utils";
import TabField from "@/contrib/google/sheets/TabField";
import { useAsyncState } from "@/hooks/common";
import { sheets } from "@/background/messenger/api";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { getErrorMessage } from "@/errors/errorHelpers";
import { LOOKUP_SCHEMA } from "@/contrib/google/sheets/lookup";
import { isEmpty, isEqual } from "lodash";
import { isExpression, isTemplateExpression } from "@/runtime/mapArgs";
import useSpreadsheetId from "@/contrib/google/sheets/useSpreadsheetId";
import { dereference } from "@/validators/generic";
import {
  BASE_SHEET_SCHEMA,
  SHEET_SERVICE_SCHEMA,
} from "@/contrib/google/sheets/schemas";
import Loader from "@/components/Loader";
import { FormErrorContext } from "@/components/form/FormErrorContext";
import { useOnChangeEffect } from "@/contrib/google/sheets/useOnChangeEffect";
import useFlags from "@/hooks/useFlags";

const DEFAULT_HEADER_SCHEMA: Schema = {
  type: "string",
};

const HeaderField: React.FunctionComponent<{
  name: string;
  spreadsheetId: string | null;
  tabName: string | Expression;
}> = ({ name, spreadsheetId, tabName }) => {
  const [{ value }, , { setValue }] = useField<string | Expression>(name);

  const [headerSchema, , headersError] = useAsyncState<Schema>(
    async () => {
      if (spreadsheetId && tabName && !isExpression(tabName)) {
        const headers = await sheets.getHeaders({
          spreadsheetId,
          tabName,
        });
        // If we loaded headers, then set the value to the first item for
        // convenience, unless there's an existing expression value in the field
        if (
          !isEmpty(headers) &&
          (!isTemplateExpression(value) || isEmpty(value.__value__))
        ) {
          setValue(headers[0]);
        }

        return {
          type: "string",
          enum: headers ?? [],
        };
      }

      return DEFAULT_HEADER_SCHEMA;
    },
    [spreadsheetId, tabName],
    DEFAULT_HEADER_SCHEMA
  );

  // TODO: We shouldn't be using the description for an error message like this, but the
  //  field is using analysis errors right now, so formik errors won't be shown.
  const fieldDescription = headersError ? (
    <span className="text-warning">
      Error determining columns: {getErrorMessage(headersError)}
    </span>
  ) : null;

  // I saw a transient error here with a null schema, but couldn't reproduce it. Leaving
  // this here for safety for now.
  const fieldSchema = headerSchema ?? DEFAULT_HEADER_SCHEMA;

  return (
    <SchemaField
      name={name}
      label="Column Header"
      description={fieldDescription}
      schema={fieldSchema}
      isRequired
    />
  );
};

const LookupSpreadsheetOptions: React.FunctionComponent<BlockOptionProps> = ({
  name,
  configKey,
}) => {
  const basePath = joinName(name, configKey);
  const spreadsheetId = useSpreadsheetId(basePath);
  const { flagOn } = useFlags();

  const [{ value: tabNameValue }, , { setValue: setTabNameValue }] = useField<
    string | Expression
  >(joinName(basePath, "tabName"));
  const headerFieldName = joinName(basePath, "header");
  const [{ value: headerValue }, , { setValue: setHeaderValue }] = useField<
    string | Expression
  >(headerFieldName);

  // Clear tab name when spreadsheetId changes, if the value is not an expression, or is empty
  useOnChangeEffect(spreadsheetId, (newValue: string, oldValue: string) => {
    // `spreadsheetId` is null when useAsyncState is loading
    if (oldValue == null) {
      return;
    }

    if (
      !isTemplateExpression(tabNameValue) ||
      isEmpty(tabNameValue.__value__)
    ) {
      setTabNameValue(null);
    }
  });

  // Clear the header value when the tab name changes, if the value is not an expression, or is empty
  useOnChangeEffect(
    tabNameValue,
    () => {
      if (
        !isTemplateExpression(headerValue) ||
        isEmpty(headerValue.__value__)
      ) {
        setHeaderValue(null);
      }
    },
    isEqual
  );

  const [sheetSchema, isLoadingSheetSchema] = useAsyncState(
    dereference(BASE_SHEET_SCHEMA),
    [],
    BASE_SHEET_SCHEMA
  );

  const oldSheetSchema: Schema = {
    title: "Spreadsheet",
    oneOf: [SHEET_SERVICE_SCHEMA, sheetSchema ?? BASE_SHEET_SCHEMA],
  };

  const sheetFieldSchema = flagOn("gsheets-mod-inputs")
    ? sheetSchema
    : oldSheetSchema;

  return (
    <div className="my-2">
      {isLoadingSheetSchema ? (
        <Loader />
      ) : (
        <FormErrorContext.Provider
          value={{
            shouldUseAnalysis: false,
            showUntouchedErrors: true,
            showFieldActions: false,
          }}
        >
          <SchemaField
            name={joinName(basePath, "spreadsheetId")}
            schema={sheetFieldSchema}
            isRequired
          />
        </FormErrorContext.Provider>
      )}
      <TabField
        name={joinName(basePath, "tabName")}
        schema={LOOKUP_SCHEMA.properties.tabName as Schema}
        spreadsheetId={spreadsheetId}
      />
      <HeaderField
        name={headerFieldName}
        spreadsheetId={spreadsheetId}
        tabName={tabNameValue}
      />
      <SchemaField
        name={joinName(basePath, "query")}
        label="Query"
        description="Value to search for in the column"
        schema={LOOKUP_SCHEMA.properties.query as Schema}
        isRequired
      />
      <SchemaField
        name={joinName(basePath, "multi")}
        label="All Matches"
        description="Toggle on to return an array of matches"
        schema={LOOKUP_SCHEMA.properties.multi as Schema}
        isRequired
      />
    </div>
  );
};

export default LookupSpreadsheetOptions;
