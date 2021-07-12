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
import { Form } from "react-bootstrap";
import { devtoolsProtocol } from "@/contrib/google/sheets/handlers";
import { FieldProps } from "@/components/fields/propTypes";
import { useField } from "formik";
import { Schema } from "@/core";
import { compact, fromPairs, identity, uniq } from "lodash";
import Select from "react-select";
import { useAsyncState } from "@/hooks/common";
import { APPEND_SCHEMA } from "@/contrib/google/sheets/append";
import { DevToolsContext } from "@/devTools/context";
import { ObjectField } from "@/components/fields/FieldTable";
import GridLoader from "react-spinners/GridLoader";
import { isNullOrBlank } from "@/utils";
import { SheetMeta } from "@/contrib/google/sheets/types";
import FileField from "@/contrib/google/sheets/FileField";

const TabField: React.FunctionComponent<
  FieldProps<string> & { doc: SheetMeta | null }
> = ({ name, doc }) => {
  const { port } = useContext(DevToolsContext);

  const [field, meta, helpers] = useField<string>(name);

  const [tabNames, tabsPending, tabsError] = useAsyncState(async () => {
    if (doc?.id && port) {
      return devtoolsProtocol.getTabNames(port, doc.id);
    } else {
      return [];
    }
  }, [doc?.id, port]);

  const sheetOptions = useMemo(() => {
    return uniq(compact([...(tabNames ?? []), field.value])).map((value) => ({
      label: value,
      value,
    }));
  }, [tabNames, field.value]);

  return (
    <Form.Group>
      <Form.Label>Tab Name</Form.Label>
      <Select
        value={sheetOptions?.filter((x) => x.value === field.value)}
        options={sheetOptions ?? []}
        onChange={(option) => helpers.setValue((option as any)?.value)}
      />
      <Form.Text className="text-muted">The spreadsheet tab</Form.Text>

      {tabsPending && (
        <span className="text-info small">Fetching sheet names...</span>
      )}

      {tabsError && (
        <span className="text-danger small">
          Error fetching sheet names: {tabsError.toString()}
        </span>
      )}

      {!tabsPending &&
        !isNullOrBlank(field.value) &&
        !tabNames.includes(field.value) &&
        doc != null && (
          <span className="text-info small">
            Tab does not exist in the sheet, it will be created
          </span>
        )}

      {meta.touched && meta.error && (
        <span className="text-danger small">{meta.error}</span>
      )}
    </Form.Group>
  );
};

const PropertiesField: React.FunctionComponent<{
  name: string;
  doc: SheetMeta | null;
  tabName: string;
}> = ({ name, tabName, doc }) => {
  const { port } = useContext(DevToolsContext);

  const [sheetSchema, schemaPending, schemaError] = useAsyncState(async () => {
    if (doc?.id && tabName) {
      const headers = await devtoolsProtocol.getHeaders(port, {
        spreadsheetId: doc.id,
        tabName,
      });
      return {
        type: "object",
        properties: fromPairs(
          headers
            .filter((x) => !isNullOrBlank(x))
            .map((header) => [header, { type: "string" }])
        ),
      } as Schema;
    } else {
      return {
        type: "object",
        additionalProperties: true,
      } as Schema;
    }
  }, [doc?.id, tabName]);

  if (schemaPending) {
    return <GridLoader />;
  } else if (schemaError) {
    return <span className="text-danger">Error fetching column headers</span>;
  } else {
    return <ObjectField label="Row Values" name={name} schema={sheetSchema} />;
  }
};

const AppendSpreadsheetOptions: React.FunctionComponent<BlockOptionProps> = ({
  name,
  configKey,
}) => {
  const basePath = [name, configKey].filter(identity).join(".");

  const [doc, setDoc] = useState<SheetMeta>(null);

  const [{ value: tabName }] = useField<string>(`${basePath}.tabName`);

  return (
    <div className="my-2">
      <FileField
        name={`${basePath}.spreadsheetId`}
        schema={APPEND_SCHEMA.properties.spreadsheetId as Schema}
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
