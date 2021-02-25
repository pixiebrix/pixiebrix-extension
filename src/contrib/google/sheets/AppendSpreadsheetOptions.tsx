/*
 * Copyright (C) 2021 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { useCallback, useContext, useMemo, useState } from "react";
import { BlockOptionProps } from "@/components/fields/blockOptions";
import { Button, Form, InputGroup } from "react-bootstrap";
import { ensureAuth } from "@/contrib/google/auth";
import {
  devtoolsProtocol,
  GOOGLE_SHEETS_SCOPES,
} from "@/contrib/google/sheets/handlers";
import { useToasts } from "react-toast-notifications";
import { browser } from "webextension-polyfill-ts";
import { isOptionsPage } from "webext-detect-page";
import { FieldProps } from "@/components/fields/propTypes";
import { useField } from "formik";
import { Schema } from "@/core";
import { fromPairs, identity, uniq, compact } from "lodash";
import Select from "react-select";
import { useAsyncState } from "@/hooks/common";
import { APPEND_SCHEMA } from "@/contrib/google/sheets/append";
import { DevToolsContext } from "@/devTools/context";
import { ObjectField } from "@/components/fields/FieldTable";
import { GridLoader } from "react-spinners";
import { isNullOrBlank } from "@/utils";
import useAsyncEffect from "use-async-effect";
import { reportError } from "@/telemetry/logging";

const API_KEY = process.env.GOOGLE_API_KEY;
const APP_ID = process.env.GOOGLE_APP_ID;

interface SheetMeta {
  id: string;
  name: string;
}

interface Doc extends SheetMeta {
  serviceId: "spread" | string;
  mimeType: "application/vnd.google-apps.spreadsheet" | string;
}

interface Data {
  action: string;
  docs: Doc[];
}

const FileField: React.FunctionComponent<
  FieldProps<string> & {
    doc: SheetMeta | null;
    onSelect: (doc: SheetMeta) => void;
  }
> = ({ name, onSelect, doc }) => {
  const { port } = useContext(DevToolsContext);
  const { addToast } = useToasts();

  const [field, meta, helpers] = useField<string>(name);

  useAsyncEffect(
    async (isMounted) => {
      const spreadsheetId = field.value;
      if (doc?.id === spreadsheetId) {
        // already up to date
        return;
      }
      try {
        if (!isNullOrBlank(field.value) && doc?.id !== spreadsheetId) {
          const properties = await devtoolsProtocol.getSheetProperties(
            port,
            field.value
          );
          if (!isMounted()) return;
          onSelect({ id: spreadsheetId, name: properties.title });
        } else {
          onSelect(null);
        }
      } catch (err) {
        if (!isMounted()) return;
        onSelect(null);
        reportError(err);
        addToast("Error retrieving sheet information", {
          appearance: "error",
          autoDismiss: true,
        });
      }
    },
    [doc?.id, field.value, onSelect, port]
  );

  const showPicker = useCallback(async () => {
    try {
      const token = await ensureAuth(GOOGLE_SHEETS_SCOPES);

      console.debug(`Using Google token: ${token}`);

      await new Promise((resolve) => {
        gapi.load("picker", {
          callback: () => resolve(),
        });
      });

      if (isNullOrBlank(APP_ID)) {
        throw new Error("Internal error: Google app id is not configured");
      } else if (isNullOrBlank(API_KEY)) {
        throw new Error("Internal error: Google API key is not configured");
      }

      const view = new google.picker.DocsView(
        google.picker.ViewId.SPREADSHEETS
      );
      const picker = new google.picker.PickerBuilder()
        .enableFeature(google.picker.Feature.NAV_HIDDEN)
        .setTitle("Select Spreadsheet")
        .setOAuthToken(token)
        .addView(view)
        .addView(new google.picker.DocsUploadView())
        .setDeveloperKey(API_KEY)
        .setAppId(APP_ID)
        .setCallback((data: Data) => {
          console.debug("Google Picker result", data);
          if (data.action === google.picker.Action.PICKED) {
            const doc = data.docs[0];
            if (doc.mimeType !== "application/vnd.google-apps.spreadsheet") {
              throw new Error(`${doc.name} is not a spreadsheet`);
            }
            helpers.setValue(data.docs[0].id);
            onSelect(doc);
          }
        })
        .setOrigin(
          isOptionsPage() ? browser.runtime.getURL("") : "devtools://devtools"
        )
        .build();
      picker.setVisible(true);
    } catch (err) {
      addToast(`Error loading file picker: ${err}`, {
        appearance: "error",
        autoDismiss: true,
      });
    }
  }, [addToast, helpers, onSelect]);

  return (
    <Form.Group>
      <Form.Label>Spreadsheet ID</Form.Label>

      <InputGroup>
        {doc ? (
          <Form.Control type="text" disabled value={doc.name} />
        ) : (
          <Form.Control
            type="text"
            disabled
            value={field.value ?? ""}
            {...field}
          />
        )}
        <InputGroup.Append>
          <Button variant="info" onClick={showPicker}>
            Select
          </Button>
        </InputGroup.Append>
      </InputGroup>

      <Form.Text className="text-muted">The Google spreadsheet</Form.Text>

      {meta.touched && meta.error && (
        <span className="text-danger small">{meta.error}</span>
      )}
    </Form.Group>
  );
};

const TabField: React.FunctionComponent<
  FieldProps<string> & { doc: SheetMeta | null }
> = ({ name, doc }) => {
  const { port } = useContext(DevToolsContext);

  const [field, meta, helpers] = useField<string>(name);

  const [tabNames, tabsPending, tabsError] = useAsyncState(async () => {
    if (doc?.id && port) {
      return await devtoolsProtocol.getTabNames(port, doc.id);
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
        !tabNames.includes(field.value) && (
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
