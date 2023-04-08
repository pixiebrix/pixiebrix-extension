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

import "./SheetsFileWidget.module.scss";

import React, { useCallback, useEffect, useState } from "react";
import { type Data, type SheetMeta } from "@/contrib/google/sheets/types";
import { useField, useFormikContext } from "formik";
import { useAsyncEffect } from "use-async-effect";
import { isNullOrBlank } from "@/utils";
import { sheets } from "@/background/messenger/api";
import { GOOGLE_SHEETS_SCOPES } from "@/contrib/google/sheets/handlers";
import { ensureAuth } from "@/contrib/google/auth";
// eslint-disable-next-line no-restricted-imports -- Only using Form.Control here
import { Form, InputGroup } from "react-bootstrap";
import notify from "@/utils/notify";
import AsyncButton from "@/components/AsyncButton";
import { type Expression } from "@/types/runtimeTypes";
import { isExpression } from "@/runtime/mapArgs";
import WorkshopMessageWidget from "@/components/fields/schemaFields/widgets/WorkshopMessageWidget";
import { type SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import useCurrentOrigin from "@/contrib/google/sheets/useCurrentOrigin";
import { isFormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { produce } from "immer";
import { produceExcludeUnusedDependencies } from "@/components/fields/schemaFields/serviceFieldUtils";

const API_KEY = process.env.GOOGLE_API_KEY;
const APP_ID = process.env.GOOGLE_APP_ID;

const SheetsFileWidget: React.FC<SchemaFieldProps> = (props) => {
  const [spreadsheetIdField, , spreadsheetIdFieldHelpers] = useField<
    string | Expression
  >(props);
  const [sheetError, setSheetError] = useState(null);
  const [doc, setDoc] = useState<SheetMeta | null>(null);

  const { values: formState, setValues: setFormState } = useFormikContext();

  // Remove unused services from the element - cleanup from deprecated integration support for gsheets
  useEffect(
    () => {
      // This widget is also used outside the Edit tab of the page editor,
      // so this won't always be FormState. We only need to clean up services
      // when it is FormState.
      if (!isFormState(formState)) {
        return;
      }

      const newState = produce(formState, (draft) =>
        produceExcludeUnusedDependencies(draft)
      );
      setFormState(newState);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Run once on mount
    []
  );

  useEffect(
    () => {
      if (sheetError?.toString().includes("not found")) {
        spreadsheetIdFieldHelpers.setError(
          "The sheet does not exist, or you do not have access to it"
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- there's a bug in Formik where changes every render
    [sheetError]
  );

  useAsyncEffect(
    async (isMounted) => {
      if (isExpression(spreadsheetIdField.value)) {
        // Expression would mean it's a service integration, and the
        // service picker shows the service name, so we don't need
        // to load the doc here.
        return;
      }

      const spreadsheetId = spreadsheetIdField.value;

      if (doc?.id === spreadsheetId) {
        // Already up to date
        return;
      }

      try {
        if (
          !isNullOrBlank(spreadsheetIdField.value) &&
          doc?.id !== spreadsheetId
        ) {
          setSheetError(null);

          const properties = await sheets.getSheetProperties(
            spreadsheetIdField.value
          );
          if (!isMounted()) return;
          setDoc({ id: spreadsheetId, name: properties.title });
        } else {
          setDoc(null);
        }
      } catch (error) {
        if (!isMounted()) return;
        setDoc(null);
        setSheetError(error);
        notify.error({ message: "Error retrieving sheet information", error });
      }
    },
    [doc?.id, spreadsheetIdField.value, setDoc, setSheetError]
  );

  const pickerOrigin = useCurrentOrigin();

  const showPicker = useCallback(async () => {
    try {
      const token = await ensureAuth(GOOGLE_SHEETS_SCOPES);

      console.debug(`Using Google token: ${token}`);

      await new Promise((resolve) => {
        gapi.load("picker", { callback: resolve });
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

            spreadsheetIdFieldHelpers.setValue(data.docs[0].id);
            setDoc(doc);
          }
        })
        .setOrigin(pickerOrigin)
        .build();
      picker.setVisible(true);
    } catch (error) {
      notify.error({
        message: "Error loading file picker",
        error,
      });
    }
  }, [spreadsheetIdFieldHelpers, pickerOrigin]);

  return isExpression(spreadsheetIdField.value) ? (
    <WorkshopMessageWidget />
  ) : (
    <InputGroup>
      {doc ? (
        // There's a time when doc.name is blank, so we're getting warnings about controlled/uncontrolled components
        <Form.Control
          id={spreadsheetIdField.name}
          type="text"
          disabled
          value={doc.name ?? spreadsheetIdField.value ?? ""}
        />
      ) : (
        <Form.Control
          id={spreadsheetIdField.name}
          type="text"
          disabled
          {...spreadsheetIdField}
          value={spreadsheetIdField.value ?? ""}
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

export default SheetsFileWidget;
