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
import { requireGoogleHOC } from "@/contrib/google/sheets/RequireGoogleApi";
import useFlags from "@/hooks/useFlags";
import { makeTemplateExpression } from "@/runtime/expressionCreators";

const DEFAULT_HEADER_SCHEMA: Schema = {
  type: "string",
};

const HeaderField: React.FunctionComponent<{
  name: string;
  spreadsheetId: string | null;
  tabName: string | Expression;
}> = ({ name, spreadsheetId, tabName }) => {
  const [
    { value: headerValue },
    ,
    { setValue: setHeaderValue, setError: setHeaderError },
  ] = useField<string | Expression>(name);

  const [headers, loading, error] = useAsyncState<string[]>(
    async () => {
      if (spreadsheetId && tabName && !isExpression(tabName)) {
        return sheets.getHeaders({
          spreadsheetId,
          tabName,
        });
      }

      return [];
    },
    [spreadsheetId, tabName],
    []
  );

  // Clear header when tabName changes, if the current value is not
  // an expression, which means it is a selected header from another tab.
  useOnChangeEffect(tabName, () => {
    if (!isTemplateExpression(headerValue)) {
      setHeaderValue(makeTemplateExpression("nunjucks", ""));
    }
  });

  // If we've loaded tab names and the tab name is not set, set it to the first tab name.
  // Check to make sure there's not an error, so we're not setting it to the first value
  // of a stale list of tabs, and check the tab name value itself to prevent an infinite
  // re-render loop here.
  useEffect(() => {
    if (loading || error || isEmpty(headers)) {
      return;
    }

    if (
      !headerValue ||
      (isExpression(headerValue) && isEmpty(headerValue.__value__))
    ) {
      setHeaderValue(headers[0]);
    }
  });

  const fieldSchema = useMemo<Schema>(
    () => ({
      type: "string",
      title: "Column Header",
      description: "The column header to use for the lookup",
      enum: headers ?? [],
    }),
    [headers]
  );

  useEffect(
    () => {
      if (!loading && error) {
        setHeaderError("Error loading headers: " + getErrorMessage(error));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Formik setters change on every render
    [error, loading]
  );

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
  const spreadsheetId = useSpreadsheetId(basePath);
  const { flagOn } = useFlags();

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
          {
            // The problem with including these inside the nested FormErrorContext.Provider is that we
            // would like analysis to run if they are in text/template mode, but not in select mode.
            // Select mode is more important, so we're leaving it like this for now.
            <>
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
            </>
          }
        </FormErrorContext.Provider>
      )}
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
