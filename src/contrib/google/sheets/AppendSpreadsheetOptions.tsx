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

import React, { useState } from "react";
import { type BlockOptionProps } from "@/components/fields/schemaFields/genericOptionsFactory";
import { sheets } from "@/background/messenger/api";
import { useField } from "formik";
import { type Expression, type Schema } from "@/core";
import { useAsyncState } from "@/hooks/common";
import { APPEND_SCHEMA } from "@/contrib/google/sheets/append";
import { isNullOrBlank, joinName } from "@/utils";
import { type SheetMeta } from "@/contrib/google/sheets/types";
import { getErrorMessage } from "@/errors/errorHelpers";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import TabField from "@/contrib/google/sheets/TabField";
import { isExpression } from "@/runtime/mapArgs";
import { dereference } from "@/validators/generic";
import Loader from "@/components/Loader";
import { FormErrorContext } from "@/components/form/FormErrorContext";

const DEFAULT_FIELDS_SCHEMA: Schema = {
  type: "object",
  additionalProperties: true,
};

const PropertiesField: React.FunctionComponent<{
  name: string;
  doc: SheetMeta | null;
  tabName: string | Expression;
}> = ({ name, tabName, doc }) => {
  const [sheetSchema, , schemaError] = useAsyncState<Schema>(
    async () => {
      if (doc?.id && tabName && !isExpression(tabName)) {
        const headers = await sheets.getHeaders({
          spreadsheetId: doc.id,
          tabName,
        });
        return {
          type: "object",
          properties: Object.fromEntries(
            headers
              .filter((x) => !isNullOrBlank(x))
              .map((header) => [header, { type: "string" }])
          ),
        };
      }

      return DEFAULT_FIELDS_SCHEMA;
    },
    [doc?.id, tabName],
    DEFAULT_FIELDS_SCHEMA
  );

  return (
    <SchemaField
      name={name}
      label="Row Values"
      isRequired
      description={
        schemaError ? (
          <span className="text-warning">
            Error determining columns: {getErrorMessage(schemaError)}
          </span>
        ) : null
      }
      schema={sheetSchema}
    />
  );
};

const AppendSpreadsheetOptions: React.FunctionComponent<BlockOptionProps> = ({
  name,
  configKey,
}) => {
  const basePath = joinName(name, configKey);

  const [doc, setDoc] = useState<SheetMeta>(null);

  const [{ value: tabName }] = useField<string | Expression>(
    joinName(basePath, "tabName")
  );

  const baseSheetSchema: Schema = {
    $ref: "https://app.pixiebrix.com/schemas/googleSheetId#",
  };
  const [sheetSchema, isLoadingSheetSchema] = useAsyncState(
    dereference(baseSheetSchema),
    []
  );
  const sheetServiceSchema: Schema = {
    $ref: "https://app.pixiebrix.com/schemas/services/google/sheet",
    title: "Google Sheet",
    description:
      "Select a Google Sheet. The first row in your sheet MUST contain headings.",
  };
  const sheetFieldSchema: Schema = {
    oneOf: [sheetServiceSchema, sheetSchema ?? baseSheetSchema],
  };

  /*
  Old Sheet input
  <ConnectedFieldTemplate
        name={joinName(basePath, "spreadsheetId")}
        label="Google Sheet"
        description="Select a Google Sheet. The first row in your sheet MUST contain headings."
        as={SheetsFileWidget}
        doc={doc}
        onSelect={setDoc}
      />
   */

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
        schema={APPEND_SCHEMA.properties.tabName as Schema}
        doc={doc}
      />
      <PropertiesField
        name={joinName(basePath, "rowValues")}
        tabName={tabName}
        doc={doc}
      />
    </div>
  );
};

export default AppendSpreadsheetOptions;
