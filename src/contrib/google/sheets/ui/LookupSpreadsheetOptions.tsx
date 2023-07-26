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

import React, { useEffect } from "react";
import { type BlockOptionProps } from "@/components/fields/schemaFields/genericOptionsFactory";
import { useField } from "formik";
import { type Expression } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { joinName } from "@/utils";
import TabField from "@/contrib/google/sheets/ui/TabField";
import { sheets } from "@/background/messenger/api";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { LOOKUP_SCHEMA } from "@/contrib/google/sheets/bricks/lookup";
import { isEmpty, isEqual } from "lodash";
import useSpreadsheetId from "@/contrib/google/sheets/core/useSpreadsheetId";
import { dereference } from "@/validators/generic";
import { BASE_SHEET_SCHEMA } from "@/contrib/google/sheets/core/schemas";
import { FormErrorContext } from "@/components/form/FormErrorContext";
import { useOnChangeEffect } from "@/contrib/google/sheets/core/useOnChangeEffect";
import { requireGoogleHOC } from "@/contrib/google/sheets/ui/RequireGoogleApi";
import { makeTemplateExpression } from "@/runtime/expressionCreators";
import { isExpression, isTemplateExpression } from "@/utils/expressionUtils";
import useGoogleAccount from "@/contrib/google/sheets/core/useGoogleAccount";
import useAsyncState from "@/hooks/useAsyncState";
import { type SanitizedIntegrationConfig } from "@/types/integrationTypes";
import AsyncStateGate from "@/components/AsyncStateGate";
import useDeriveAsyncState from "@/hooks/useDeriveAsyncState";
import { type Spreadsheet } from "@/contrib/google/sheets/core/types";

const HeaderField: React.FunctionComponent<{
  name: string;
  spreadsheet: Spreadsheet | null;
  tabName: string | Expression;
}> = ({ name, spreadsheet, tabName }) => {
  const [{ value: headerValue }, , { setValue: setHeaderValue }] = useField<
    string | Expression
  >(name);

  const rawTabName = isExpression(tabName) ? tabName.__value__ : tabName;

  const sheet = spreadsheet?.sheets?.find(
    (sheet) => sheet.properties.title === rawTabName
  );
  const headers =
    sheet?.data?.[0]?.rowData?.[0]?.values?.map(
      (value) => value.formattedValue
    ) ?? [];
  const fieldSchema: Schema = {
    type: "string",
    title: "Column Header",
    description: "The column header to use for the lookup",
    enum: headers,
  };

  // Clear header when tabName changes, if the current value is not
  // an expression, which means it is a selected header from another tab.
  useOnChangeEffect(tabName, () => {
    if (!isTemplateExpression(headerValue)) {
      setHeaderValue(makeTemplateExpression("nunjucks", ""));
    }
  });

  // If we've loaded headers and the header value is not set, set it to the first header.
  useEffect(() => {
    if (isEmpty(headers)) {
      return;
    }

    if (
      !headerValue ||
      (isExpression(headerValue) && isEmpty(headerValue.__value__))
    ) {
      setHeaderValue(headers[0]);
    }
  });

  return (
    <SchemaField
      name={name}
      schema={fieldSchema}
      isRequired
      defaultType="select"
    />
  );
};

const LookupSpreadsheetOptions: React.FunctionComponent<BlockOptionProps> = ({
  name,
  configKey,
}) => {
  const basePath = joinName(name, configKey);
  const googleAccountAsyncState = useGoogleAccount(basePath);
  const spreadsheetIdAsyncState = useSpreadsheetId(basePath);

  const [{ value: tabNameValue }] = useField<string | Expression>(
    joinName(basePath, "tabName")
  );
  const headerFieldName = joinName(basePath, "header");
  const [{ value: headerValue }, , { setValue: setHeaderValue }] = useField<
    string | Expression
  >(headerFieldName);

  // Clear the header value when the tab name changes, if the value is not an expression, or is empty
  useOnChangeEffect(
    tabNameValue,
    () => {
      if (!isTemplateExpression(headerValue)) {
        setHeaderValue(makeTemplateExpression("nunjucks", ""));
      }
    },
    isEqual
  );

  const baseSchemaAsyncState = useAsyncState(
    dereference(BASE_SHEET_SCHEMA),
    [],
    {
      initialValue: BASE_SHEET_SCHEMA,
    }
  );

  const spreadsheetSchemaState = useDeriveAsyncState(
    googleAccountAsyncState,
    baseSchemaAsyncState,
    async (
      googleAccount: SanitizedIntegrationConfig | null,
      baseSchema: Schema
    ) => {
      if (googleAccount == null) {
        return baseSchema;
      }

      const spreadsheetFileList = await sheets.getAllSpreadsheets(
        googleAccount
      );
      if (isEmpty(spreadsheetFileList.files)) {
        return baseSchema;
      }

      const spreadsheetSchemaEnum = spreadsheetFileList.files.map((file) => ({
        const: file.id,
        title: file.name,
      }));
      return {
        title: "Spreadsheet",
        oneOf: [
          baseSchema,
          {
            type: "string",
            oneOf: spreadsheetSchemaEnum,
          },
        ],
      } as Schema;
    }
  );

  const spreadsheetAsyncState = useDeriveAsyncState(
    googleAccountAsyncState,
    spreadsheetIdAsyncState,
    async (
      googleAccount: SanitizedIntegrationConfig | null,
      spreadsheetId: string | null
    ) => {
      if (spreadsheetId == null) {
        return null;
      }

      // Sheets api handles fallback situation when googleAccount is null
      return sheets.getSpreadsheet(
        {
          googleAccount,
          spreadsheetId,
        },
        { includeGridData: true }
      );
    }
  );

  const spreadsheetFormAsyncState = useDeriveAsyncState(
    spreadsheetAsyncState,
    spreadsheetSchemaState,
    async (spreadsheet: Spreadsheet, schema) => ({
      spreadsheet,
      schema,
    })
  );

  return (
    <div className="my-2">
      <SchemaField
        name={joinName(basePath, "googleAccount")}
        schema={LOOKUP_SCHEMA.properties.googleAccount as Schema}
      />
      <AsyncStateGate state={spreadsheetFormAsyncState}>
        {({ data: { spreadsheet, schema } }) => (
          <FormErrorContext.Provider
            value={{
              shouldUseAnalysis: false,
              showUntouchedErrors: true,
              showFieldActions: false,
            }}
          >
            <SchemaField
              name={joinName(basePath, "spreadsheetId")}
              schema={schema}
              isRequired
            />
            {
              // The problem with including these inside the nested FormErrorContext.Provider is that we
              // would like analysis to run if they are in text/template mode, but not in select mode.
              // Select mode is more important, so we're leaving it like this for now.
              <>
                <TabField
                  name={joinName(basePath, "tabName")}
                  schema={LOOKUP_SCHEMA.properties.tabName as Schema}
                  spreadsheet={spreadsheet}
                />
                <HeaderField
                  name={headerFieldName}
                  spreadsheet={spreadsheet}
                  tabName={tabNameValue}
                />
              </>
            }
          </FormErrorContext.Provider>
        )}
      </AsyncStateGate>
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

export default requireGoogleHOC(LookupSpreadsheetOptions);
