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
import { type SheetMeta } from "@/contrib/google/sheets/core/types";
import { useField, useFormikContext } from "formik";
import { sheets } from "@/background/messenger/api";
// eslint-disable-next-line no-restricted-imports -- Only using Form.Control here
import { Form, InputGroup } from "react-bootstrap";
import notify from "@/utils/notify";
import AsyncButton from "@/components/AsyncButton";
import { type Expression } from "@/types/runtimeTypes";
import WorkshopMessageWidget from "@/components/fields/schemaFields/widgets/WorkshopMessageWidget";
import { type SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { isModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { produce } from "immer";
import { produceExcludeUnusedDependencies } from "@/components/fields/schemaFields/serviceFieldUtils";
import useGoogleSpreadsheetPicker from "@/contrib/google/sheets/ui/useGoogleSpreadsheetPicker";
import { requireGoogleHOC } from "@/contrib/google/sheets/ui/RequireGoogleApi";
import { getErrorMessage, isSpecificError } from "@/errors/errorHelpers";
import { CancelError } from "@/errors/businessErrors";
import useAsyncState from "@/hooks/useAsyncState";
import reportError from "@/telemetry/reportError";
import { isExpression } from "@/utils/expressionUtils";
import { isNullOrBlank } from "@/utils/stringUtils";
import useTimeoutState from "@/hooks/useTimeoutState";
import chromeP from "webext-polyfill-kinda";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import useGoogleAccount from "@/contrib/google/sheets/core/useGoogleAccount";
import { type SanitizedIntegrationConfig } from "@/types/integrationTypes";
import { isEmpty } from "lodash";
import useDeriveAsyncState from "@/hooks/useDeriveAsyncState";
import {
  SPREADSHEET_FIELD_DESCRIPTION,
  SPREADSHEET_FIELD_TITLE,
} from "@/contrib/google/sheets/core/schemas";
import { type Schema } from "@/types/schemaTypes";
import AsyncStateGate from "@/components/AsyncStateGate";
import SchemaSelectWidget from "@/components/fields/schemaFields/widgets/SchemaSelectWidget";

/**
 * Timeout indicating that the Chrome identity API may be hanging.
 */
const ENSURE_TOKEN_TIMEOUT_MILLIS = 3000;

const ErrorView: React.FC<{
  message: string;
  retryHandler: () => Promise<void>;
}> = ({ message, retryHandler }) => {
  useEffect(() => {
    // Report the event. This will provide a false positive while the user is choosing their account
    // to authenticate with Google. (Because it may take longer than `ENSURE_TOKEN_TIMEOUT_MILLIS` for the
    // user to select their account.)
    reportEvent(Events.SELECT_GOOGLE_SPREADSHEET_VIEW_WARNING, {
      message,
    });
  }, [message]);

  return (
    <div>
      <div>
        {message} See{" "}
        <a
          href="https://docs.pixiebrix.com/integrations/troubleshooting-google-integration-errors"
          target="_blank"
          rel="noreferrer"
        >
          troubleshooting information.
        </a>
      </div>
      <div>
        <AsyncButton onClick={retryHandler}>Try Again</AsyncButton>
      </div>
    </div>
  );
};

const LegacySpreadsheetPickerWidget: React.FC<SchemaFieldProps> = ({
  name,
}) => {
  const { values: formState, setValues: setFormState } = useFormikContext();

  const [pickerError, setPickerError] = useState<unknown>(null);

  const [spreadsheetIdField, , spreadsheetIdFieldHelpers] = useField<
    string | Expression
  >(name);

  const {
    ensureSheetsTokenAction,
    showPicker,
    hasRejectedPermissions,
    startTimestamp,
  } = useGoogleSpreadsheetPicker();

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

  // True if the Chrome APIs for retrieving the token may be hanging. May also indicate Chrome is showing the
  // authentication popup, but the user hasn't finished interacting with it yet.
  const isEnsureSheetsHanging = useTimeoutState(
    startTimestamp ? ENSURE_TOKEN_TIMEOUT_MILLIS : null
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

  if (isExpression(spreadsheetIdField.value)) {
    return <WorkshopMessageWidget />;
  }

  if (isEnsureSheetsHanging || pickerError || hasRejectedPermissions) {
    let message = "Error showing Google File Picker.";
    if (hasRejectedPermissions) {
      message =
        "You did not approve access, or your company policy prevents access to Google Sheets.";
    } else if (isEnsureSheetsHanging) {
      message =
        "Select your Google Account from the popup. If Chrome is not displaying an authentication popup, try clicking below to retry.";
    }

    return (
      <ErrorView
        message={message}
        retryHandler={async () => {
          setPickerError(null);

          // Calling `clearAllCachedAuthTokens` will clear out the local Google authentication state and any other
          // OAuth2 tokens the user has. The Google server might still cache the selected account.
          // https://developer.chrome.com/docs/extensions/reference/identity/#method-clearAllCachedAuthTokens
          await chromeP.identity.clearAllCachedAuthTokens();

          if (await ensureSheetsTokenAction()) {
            await pickerHandler();
          }
        }}
      />
    );
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

function isBaseSchema(schema: Schema): boolean {
  // Cover both the normalized and de-referenced base schema
  return Object.hasOwn(schema, "$ref") || Object.hasOwn(schema, "$id");
}

const SpreadsheetPickerWidget: React.FC<SchemaFieldProps> = (props) => {
  const { schema: baseSchema } = props;
  const googleAccountAsyncState = useGoogleAccount();
  const schemaAsyncState = useDeriveAsyncState(
    googleAccountAsyncState,
    async (googleAccount: SanitizedIntegrationConfig) => {
      if (!googleAccount) {
        return baseSchema;
      }

      const spreadsheetFileList = await sheets.getAllSpreadsheets(
        googleAccount
      );
      if (isEmpty(spreadsheetFileList.files)) {
        return baseSchema;
      }

      const spreadsheetSchemaEnum = spreadsheetFileList.files.map((file) => ({
        const: file.id,
        title: file.name,
      }));
      return {
        type: "string",
        title: SPREADSHEET_FIELD_TITLE,
        description: SPREADSHEET_FIELD_DESCRIPTION,
        oneOf: spreadsheetSchemaEnum,
      } as Schema;
    }
  );

  return (
    <AsyncStateGate state={schemaAsyncState} renderLoader={() => null}>
      {({ data: schema }) =>
        isBaseSchema(schema) ? (
          <LegacySpreadsheetPickerWidget {...props} />
        ) : (
          <SchemaSelectWidget {...props} schema={schema} />
        )
      }
    </AsyncStateGate>
  );
};

// Ensure Google API is loaded before trying to render widget during mod activation, etc.
export default requireGoogleHOC(SpreadsheetPickerWidget);
