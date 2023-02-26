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
import { isEmpty } from "lodash";
import { isExpression, isTemplateExpression } from "@/runtime/mapArgs";
import useSpreadsheetId from "@/contrib/google/sheets/useSpreadsheetId";
import { dereference } from "@/validators/generic";
import {
  BASE_SHEET_SCHEMA,
  SHEET_SERVICE_SCHEMA,
} from "@/contrib/google/sheets/schemas";
import Loader from "@/components/Loader";
import { FormErrorContext } from "@/components/form/FormErrorContext";

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
        if (
          !isEmpty(headers) &&
          isTemplateExpression(value) &&
          isEmpty(value.__value__)
        ) {
          // When the current value is an empty expression, we can set
          // it to null here, instead, to force the field to start on
          // the select field toggle option
          setValue(null);
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

  return (
    <SchemaField
      name={name}
      label="Column Header"
      description={
        headersError ? (
          <span className="text-warning">
            Error determining columns: {getErrorMessage(headersError)}
          </span>
        ) : null
      }
      schema={headerSchema}
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

  const [{ value: tabName }] = useField<string | Expression>(
    joinName(basePath, "tabName")
  );

  const [sheetSchema, isLoadingSheetSchema] = useAsyncState(
    dereference(BASE_SHEET_SCHEMA),
    []
  );
  const sheetFieldSchema: Schema = {
    oneOf: [SHEET_SERVICE_SCHEMA, sheetSchema ?? BASE_SHEET_SCHEMA],
  };

  return (
    <div className="my-2">
      {isLoadingSheetSchema ? (
        <Loader />
      ) : (
        <FormErrorContext.Provider
          value={{
            shouldUseAnalysis: false,
            showUntouchedErrors: false,
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
        name={joinName(basePath, "header")}
        spreadsheetId={spreadsheetId}
        tabName={tabName}
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
