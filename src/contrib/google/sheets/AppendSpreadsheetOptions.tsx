/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import React, { useContext, useMemo, useState } from "react";
import { BlockOptionProps } from "@/components/fields/blockOptions";
import { devtoolsProtocol } from "@/contrib/google/sheets/handlers";
import { SchemaFieldProps } from "@/components/fields/propTypes";
import { useField } from "formik";
import { Schema } from "@/core";
import { compact, uniq } from "lodash";
import { useAsyncState } from "@/hooks/common";
import { APPEND_SCHEMA } from "@/contrib/google/sheets/append";
import { DevToolsContext } from "@/devTools/context";
import { isNullOrBlank } from "@/utils";
import { SheetMeta } from "@/contrib/google/sheets/types";
import FileWidget from "@/contrib/google/sheets/FileWidget";
import ObjectField from "@/components/fields/schemaFields/ObjectField";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import SelectWidget from "@/devTools/editor/fields/SelectWidget";
import { getErrorMessage } from "@/errors";

const DEFAULT_FIELDS_SCHEMA: Schema = {
  type: "object",
  additionalProperties: true,
};

const TabField: React.FunctionComponent<
  SchemaFieldProps<string> & { doc: SheetMeta | null }
> = ({ name, doc }) => {
  const { port } = useContext(DevToolsContext);

  const [field] = useField<string>(name);

  const [tabNames, tabsPending, tabsError] = useAsyncState(async () => {
    if (doc?.id && port) {
      return devtoolsProtocol.getTabNames(port, doc.id);
    }

    return [];
  }, [doc?.id, port]);

  const sheetOptions = useMemo(
    () =>
      uniq(compact([...(tabNames ?? []), field.value])).map((value) => ({
        label: value,
        value,
      })),
    [tabNames, field.value]
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
    <ConnectedFieldTemplate
      name={name}
      label="Tab Name"
      description="The spreadsheet tab"
      as={SelectWidget}
      loadError={tabsError}
      isLoading={tabsPending}
      options={sheetOptions}
      loadingMessage="Fetching sheet names..."
    />
  );
};

const PropertiesField: React.FunctionComponent<{
  name: string;
  doc: SheetMeta | null;
  tabName: string;
}> = ({ name, tabName, doc }) => {
  const { port } = useContext(DevToolsContext);

  const [sheetSchema, , schemaError] = useAsyncState(async () => {
    if (doc?.id && tabName) {
      const headers = await devtoolsProtocol.getHeaders(port, {
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
    <ObjectField
      name={name}
      label="Row Values"
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
  const basePath = compact([name, configKey]).join(".");

  const [doc, setDoc] = useState<SheetMeta>(null);

  const [{ value: tabName }] = useField<string>(`${basePath}.tabName`);

  return (
    <div className="my-2">
      <ConnectedFieldTemplate
        name={`${basePath}.spreadsheetId`}
        label="Google Sheet"
        description="Select a Google Sheet"
        as={FileWidget}
        doc={doc}
        onSelect={setDoc}
      />
      <TabField
        name={`${basePath}.tabName`}
        schema={APPEND_SCHEMA.properties.tabName as Schema}
        doc={doc}
      />
      <PropertiesField
        name={`${basePath}.rowValues`}
        tabName={tabName}
        doc={doc}
      />
    </div>
  );
};

export default AppendSpreadsheetOptions;
