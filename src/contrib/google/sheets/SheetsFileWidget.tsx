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

import React, { useEffect, useState } from "react";
import { type SheetMeta } from "@/contrib/google/sheets/types";
import { useField, useFormikContext } from "formik";
import { isNullOrBlank } from "@/utils";
import { sheets } from "@/background/messenger/api";
// eslint-disable-next-line no-restricted-imports -- Only using Form.Control here
import { Form, InputGroup } from "react-bootstrap";
import notify from "@/utils/notify";
import AsyncButton from "@/components/AsyncButton";
import { type Expression } from "@/types/runtimeTypes";
import WorkshopMessageWidget from "@/components/fields/schemaFields/widgets/WorkshopMessageWidget";
import { type SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { isModComponentFormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { produce } from "immer";
import { produceExcludeUnusedDependencies } from "@/components/fields/schemaFields/serviceFieldUtils";
import useGoogleSpreadsheetPicker from "@/contrib/google/sheets/useGoogleSpreadsheetPicker";
import { requireGoogleHOC } from "@/contrib/google/sheets/RequireGoogleApi";
import { getErrorMessage, isSpecificError } from "@/errors/errorHelpers";
import { CancelError } from "@/errors/businessErrors";
import useAsyncState from "@/hooks/useAsyncState";
import reportError from "@/telemetry/reportError";
import { isExpression } from "@/utils/expressionUtils";

const SheetsFileWidget: React.FC<SchemaFieldProps> = (props) => {
  const { values: formState, setValues: setFormState } = useFormikContext();

  const [pickerError, setPickerError] = useState<unknown>(null);

  const [spreadsheetIdField, , spreadsheetIdFieldHelpers] = useField<
    string | Expression
  >(props);

  const { ensureSheetsTokenAction, showPicker, hasRejectedPermissions } =
    useGoogleSpreadsheetPicker();

  // Remove unused services from the element - cleanup from deprecated integration support for gsheets
  useEffect(
    () => {
      // This widget is also used outside the Edit tab of the Page Editor,
      // so this won't always be FormState. We only need to clean up services
      // when it is FormState.
      if (!isModComponentFormState(formState)) {
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

  const sheetMetaState = useAsyncState<SheetMeta | null>(async () => {
    const spreadsheetId = spreadsheetIdField.value;

    // Expression would mean it's a service integration, and the integration picker shows the configuration name, so we
    // don't need to type to load the doc metadata
    if (!isExpression(spreadsheetId) && !isNullOrBlank(spreadsheetId)) {
      const properties = await sheets.getSheetProperties(spreadsheetId);
      return { id: spreadsheetId, name: properties.title };
    }

    return null;
  }, [spreadsheetIdField.value]);

  // Set sheet lookup error on Formik
  useEffect(
    () => {
      if (sheetMetaState.error) {
        const message = getErrorMessage(sheetMetaState.error);

        if (getErrorMessage(message).includes("not found")) {
          spreadsheetIdFieldHelpers.setError(
            "The sheet does not exist, or you do not have access to it"
          );
        } else {
          spreadsheetIdFieldHelpers.setError(
            `Error retrieving sheet information: ${message}`
          );
        }

        // Report to Rollbar to assist with debugging
        reportError(sheetMetaState.error);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- there's a bug in Formik where `setError` changes every render
    [sheetMetaState.error]
  );

  const pickerHandler = async () => {
    try {
      const doc = await showPicker();
      // We have the name from the doc. However, just set the field value, which will trigger a fetch of the
      // metadata to check/verify API access to the sheet
      spreadsheetIdFieldHelpers.setValue(doc.id);
    } catch (error) {
      if (!isSpecificError(error, CancelError)) {
        setPickerError(error);

        // Notify and report to Rollbar
        notify.error({
          message: "Error loading Google File Picker",
          error,
          includeErrorDetails: true,
        });
      }
    }
  };

  if (pickerError) {
    return (
      <div>
        Error showing Google File Picker. See{" "}
        <a
          href="https://docs.pixiebrix.com/integrations/troubleshooting-google-integration-errors"
          target="_blank"
          rel="noreferrer"
        >
          troubleshooting information.
        </a>
        <AsyncButton
          onClick={async () => {
            setPickerError(null);
            if (await ensureSheetsTokenAction()) {
              await pickerHandler();
            }
          }}
        >
          Try Again
        </AsyncButton>
      </div>
    );
  }

  if (hasRejectedPermissions) {
    return (
      <div>
        PixieBrix cannot access your Google Account. See{" "}
        <a
          href="https://docs.pixiebrix.com/integrations/troubleshooting-google-integration-errors"
          target="_blank"
          rel="noreferrer"
        >
          troubleshooting information.
        </a>
        <AsyncButton onClick={ensureSheetsTokenAction}>Try Again</AsyncButton>
      </div>
    );
  }

  if (isExpression(spreadsheetIdField.value)) {
    return <WorkshopMessageWidget />;
  }

  return (
    <InputGroup>
      {sheetMetaState.data ? (
        // There's a render when doc.name is blank while fetching, so we're getting warnings about
        // controlled/uncontrolled components. Therefore, fall back to the id if the name isn't provided yet
        <Form.Control
          id={spreadsheetIdField.name}
          type="text"
          disabled
          value={sheetMetaState.data.name ?? spreadsheetIdField.value ?? ""}
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
        <AsyncButton variant="info" onClick={pickerHandler}>
          Select
        </AsyncButton>
      </InputGroup.Append>
    </InputGroup>
  );
};

// Ensure Google API is loaded before trying to render widget during mod activation, etc.
export default requireGoogleHOC(SheetsFileWidget);
