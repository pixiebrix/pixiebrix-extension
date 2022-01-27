/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import { BlockOptionProps } from "@/components/fields/schemaFields/genericOptionsFactory";
import { sheets } from "@/background/messenger/api";
import { useField } from "formik";
import { Expression, Schema } from "@/core";
import { useAsyncState } from "@/hooks/common";
import { APPEND_SCHEMA } from "@/contrib/google/sheets/append";
import { isNullOrBlank, joinName } from "@/utils";
import { SheetMeta } from "@/contrib/google/sheets/types";
import FileWidget from "@/contrib/google/sheets/FileWidget";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { getErrorMessage } from "@/errors";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import TabField from "@/contrib/google/sheets/TabField";
import { isExpression } from "@/runtime/mapArgs";

const DEFAULT_FIELDS_SCHEMA: Schema = {
  type: "object",
  additionalProperties: true,
};

const PropertiesField: React.FunctionComponent<{
  name: string;
  doc: SheetMeta | null;
  tabName: string | Expression;
}> = ({ name, tabName, doc }) => {
  const [sheetSchema, , schemaError] = useAsyncState(async () => {
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
      } as Schema;
    }

    return DEFAULT_FIELDS_SCHEMA;
  }, [doc?.id, tabName]);

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
      schema={sheetSchema ?? DEFAULT_FIELDS_SCHEMA}
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

  return (
    <div className="my-2">
      <ConnectedFieldTemplate
        name={joinName(basePath, "spreadsheetId")}
        label="Google Sheet"
        description="Select a Google Sheet"
        as={FileWidget}
        doc={doc}
        onSelect={setDoc}
      />
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
