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
import { sheets } from "@/background/messenger/api";
import { useField } from "formik";
import { type Expression } from "@/types/runtimeTypes";
import { APPEND_SCHEMA } from "@/contrib/google/sheets/bricks/append";
import { isNullOrBlank, joinName } from "@/utils";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import TabField from "@/contrib/google/sheets/ui/TabField";
import { dereference } from "@/validators/generic";
import { FormErrorContext } from "@/components/form/FormErrorContext";
import useSpreadsheetId from "@/contrib/google/sheets/core/useSpreadsheetId";
import { BASE_SHEET_SCHEMA } from "@/contrib/google/sheets/core/schemas";
import { isEmpty, isEqual } from "lodash";
import { useOnChangeEffect } from "@/contrib/google/sheets/core/useOnChangeEffect";
import { requireGoogleHOC } from "@/contrib/google/sheets/ui/RequireGoogleApi";
import { type Schema } from "@/types/schemaTypes";
import { isTemplateExpression } from "@/utils/expressionUtils";
import useGoogleAccount from "@/contrib/google/sheets/core/useGoogleAccount";
import useDeriveAsyncState from "@/hooks/useDeriveAsyncState";
import { type SanitizedIntegrationConfig } from "@/types/integrationTypes";
import { type Spreadsheet } from "@/contrib/google/sheets/core/types";
import AsyncStateGate from "@/components/AsyncStateGate";
import useAsyncState from "@/hooks/useAsyncState";
import { type UnknownObject } from "@/types/objectTypes";
import getHeadersForSpreadsheetTab from "@/contrib/google/sheets/core/getHeadersForSpreadsheetTab";

const RowValuesField: React.FunctionComponent<{
  name: string;
  spreadsheet: Spreadsheet | null;
  tabName: string | Expression;
}> = ({ name, spreadsheet, tabName }) => {
  const [{ value: rowValues }, , { setValue: setRowValues }] =
    useField<UnknownObject>(name);

  const headers = getHeadersForSpreadsheetTab(spreadsheet, tabName);
  const fieldSchema: Schema = isEmpty(headers)
    ? {
        type: "object",
        additionalProperties: true,
      }
    : {
        type: "object",
        properties: Object.fromEntries(
          headers
            .filter((x) => !isNullOrBlank(x))
            .map((header) => [header, { type: "string" }])
        ),
      };

  // Clear row values when tabName changes, if the value is not an expression, or is empty
  useOnChangeEffect(
    tabName,
    () => {
      if (!isTemplateExpression(rowValues) || isEmpty(rowValues.__value__)) {
        setRowValues({});
      }
    },
    isEqual
  );

  return (
    <SchemaField
      name={name}
      label="Row Values"
      isRequired
      schema={fieldSchema}
    />
  );
};

const AppendSpreadsheetOptions: React.FunctionComponent<BlockOptionProps> = ({
  name,
  configKey,
}) => {
  const basePath = joinName(name, configKey);
  const googleAccountAsyncState = useGoogleAccount(basePath);
  const spreadsheetIdAsyncState = useSpreadsheetId(basePath);

  const [{ value: tabName }] = useField<string | Expression>(
    joinName(basePath, "tabName")
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
        schema={APPEND_SCHEMA.properties.googleAccount as Schema}
      />
      <AsyncStateGate state={spreadsheetFormAsyncState}>
        {({ data: { spreadsheet, schema } }) => (
          <>
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
                // The problem with including this inside the nested FormErrorContext.Provider is that we
                // would like analysis to run if this is in text/template mode, but not if it's in select mode.
                // Select mode is more important, so we're leaving it like this for now.
                <TabField
                  name={joinName(basePath, "tabName")}
                  schema={APPEND_SCHEMA.properties.tabName as Schema}
                  spreadsheet={spreadsheet}
                />
              }
            </FormErrorContext.Provider>
            <RowValuesField
              name={joinName(basePath, "rowValues")}
              spreadsheet={spreadsheet}
              tabName={tabName}
            />
          </>
        )}
      </AsyncStateGate>
    </div>
  );
};

export default requireGoogleHOC(AppendSpreadsheetOptions);
