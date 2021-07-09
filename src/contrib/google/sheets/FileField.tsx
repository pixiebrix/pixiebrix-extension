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

import React, { useCallback, useContext, useState } from "react";
import { FieldProps } from "@/components/fields/propTypes";
import { Data, SheetMeta } from "@/contrib/google/sheets/types";
import { DevToolsContext } from "@/devTools/context";
import { useToasts } from "react-toast-notifications";
import { useField } from "formik";
import useAsyncEffect from "use-async-effect";
import { isNullOrBlank } from "@/utils";
import {
  devtoolsProtocol,
  GOOGLE_SHEETS_SCOPES,
} from "@/contrib/google/sheets/handlers";
import * as sheetHandlers from "@/contrib/google/sheets/handlers";
import { reportError } from "@/telemetry/logging";
import { ensureAuth } from "@/contrib/google/auth";
import { partial } from "lodash";
import { isOptionsPage } from "webext-detect-page";
import { browser } from "webextension-polyfill-ts";
import { Button, Form, InputGroup } from "react-bootstrap";

const API_KEY = process.env.GOOGLE_API_KEY;
const APP_ID = process.env.GOOGLE_APP_ID;

const FileField: React.FunctionComponent<
  FieldProps<string> & {
    doc: SheetMeta | null;
    onSelect: (doc: SheetMeta) => void;
  }
> = ({ name, onSelect, doc }) => {
  const { port } = useContext(DevToolsContext);
  const { addToast } = useToasts();

  const [field, meta, helpers] = useField<string>(name);
  const [sheetError, setSheetError] = useState(null);

  useAsyncEffect(
    async (isMounted) => {
      const spreadsheetId = field.value;

      if (doc?.id === spreadsheetId) {
        // already up to date
        return;
      }
      try {
        if (!isNullOrBlank(field.value) && doc?.id !== spreadsheetId) {
          setSheetError(null);

          const method = isOptionsPage()
            ? sheetHandlers.getSheetProperties
            : partial(devtoolsProtocol.getSheetProperties, port);

          const properties = await method(field.value);
          if (!isMounted()) return;
          onSelect({ id: spreadsheetId, name: properties.title });
        } else {
          onSelect(null);
        }
      } catch (error) {
        if (!isMounted()) return;
        onSelect(null);
        reportError(error);
        setSheetError(error);
        addToast("Error retrieving sheet information", {
          appearance: "error",
          autoDismiss: true,
        });
      }
    },
    [doc?.id, field.value, onSelect, port, setSheetError]
  );

  const showPicker = useCallback(async () => {
    try {
      const token = await ensureAuth(GOOGLE_SHEETS_SCOPES);

      console.debug(`Using Google token: ${token}`);

      await new Promise<void>((resolve) => {
        gapi.load("picker", {
          callback: () => resolve(),
        });
      });

      if (isNullOrBlank(APP_ID)) {
        throw new Error("Internal error: Google app ID is not configured");
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
    } catch (error) {
      addToast(`Error loading file picker: ${error}`, {
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

      {sheetError?.toString().includes("not found") && (
        <span className="text-danger small">
          The sheet does not exist, or you do not have access to it
        </span>
      )}

      {meta.touched && meta.error && (
        <span className="text-danger small">{meta.error}</span>
      )}
    </Form.Group>
  );
};

export default FileField;
