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

import React, { useCallback, useEffect, useState } from "react";
import { Data, SheetMeta } from "@/contrib/google/sheets/types";
import { useField } from "formik";
import { useAsyncEffect } from "use-async-effect";
import { isNullOrBlank } from "@/utils";
import { sheets } from "@/background/messenger/api";
import { GOOGLE_SHEETS_SCOPES } from "@/contrib/google/sheets/handlers";
import { ensureAuth } from "@/contrib/google/auth";
import { isOptionsPage } from "webext-detect-page";
import browser from "webextension-polyfill";
import { Form, InputGroup } from "react-bootstrap";
import useNotifications from "@/hooks/useNotifications";
import { getErrorMessage } from "@/errors";
import AsyncButton from "@/components/AsyncButton";
import { isExpression } from "@/runtime/mapArgs";
import { Expression } from "@/core";

const API_KEY = process.env.GOOGLE_API_KEY;
const APP_ID = process.env.GOOGLE_APP_ID;

type FileWidgetProps = {
  id?: string;
  name: string;
  doc: SheetMeta | null;
  onSelect: (doc: SheetMeta) => void;
};

const FileWidget: React.FC<FileWidgetProps> = ({ doc, onSelect, ...props }) => {
  const notify = useNotifications();

  const [field, , helpers] = useField<string | Expression>(props);
  const spreadsheetId = isExpression(field.value)
    ? field.value.__value__
    : field.value;
  const [sheetError, setSheetError] = useState(null);

  useEffect(
    () => {
      if (sheetError?.toString().includes("not found")) {
        helpers.setError(
          "The sheet does not exist, or you do not have access to it"
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- there's a bug in Formik where changes every render
    [sheetError]
  );

  useAsyncEffect(
    async (isMounted) => {
      if (doc?.id === spreadsheetId) {
        // Already up to date
        return;
      }

      try {
        if (!isNullOrBlank(spreadsheetId) && doc?.id !== spreadsheetId) {
          setSheetError(null);

          const properties = await sheets.getSheetProperties(spreadsheetId);
          if (!isMounted()) return;
          onSelect({ id: spreadsheetId, name: properties.title });
        } else {
          onSelect(null);
        }
      } catch (error) {
        if (!isMounted()) return;
        onSelect(null);
        setSheetError(error);
        notify.error("Error retrieving sheet information", {
          error,
        });
      }
    },
    [doc?.id, spreadsheetId, onSelect, setSheetError]
  );

  const showPicker = useCallback(async () => {
    try {
      const token = await ensureAuth(GOOGLE_SHEETS_SCOPES);

      console.debug(`Using Google token: ${token}`);

      await new Promise<void>((resolve) => {
        gapi.load("picker", {
          callback: () => {
            resolve();
          },
        });
      });

      if (isNullOrBlank(APP_ID)) {
        throw new Error("Internal error: Google app ID is not configured");
      }

      if (isNullOrBlank(API_KEY)) {
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
      notify.error(`Error loading file picker: ${getErrorMessage(error)}`, {
        error,
      });
    }
  }, [notify, helpers, onSelect]);

  return (
    <InputGroup>
      {doc ? (
        // There's a time when doc.name is blank, so we're getting warnings about controlled/uncontrolled components
        <Form.Control
          type="text"
          disabled
          value={doc.name ?? spreadsheetId ?? ""}
        />
      ) : (
        <Form.Control
          type="text"
          disabled
          {...field}
          value={spreadsheetId ?? ""}
        />
      )}
      <InputGroup.Append>
        <AsyncButton variant="info" onClick={showPicker}>
          Select
        </AsyncButton>
      </InputGroup.Append>
    </InputGroup>
  );
};

export default FileWidget;
