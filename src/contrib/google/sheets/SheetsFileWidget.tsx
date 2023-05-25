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
import { useAsyncEffect } from "use-async-effect";
import { isNullOrBlank } from "@/utils";
import { sheets } from "@/background/messenger/api";
// eslint-disable-next-line no-restricted-imports -- Only using Form.Control here
import { Form, InputGroup } from "react-bootstrap";
import notify from "@/utils/notify";
import AsyncButton from "@/components/AsyncButton";
import { type Expression } from "@/types/runtimeTypes";
import { isExpression } from "@/runtime/mapArgs";
import WorkshopMessageWidget from "@/components/fields/schemaFields/widgets/WorkshopMessageWidget";
import { type SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { isFormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { produce } from "immer";
import { produceExcludeUnusedDependencies } from "@/components/fields/schemaFields/serviceFieldUtils";
import useGoogleSpreadsheetPicker from "@/contrib/google/sheets/useGoogleSpreadsheetPicker";
import { requireGoogleHOC } from "@/contrib/google/sheets/RequireGoogleApi";
import { getErrorMessage } from "@/errors/errorHelpers";

const SheetsFileWidget: React.FC<SchemaFieldProps> = (props) => {
  const [spreadsheetIdField, , spreadsheetIdFieldHelpers] = useField<
    string | Expression
  >(props);
  const { values: formState, setValues: setFormState } = useFormikContext();
  const [sheetError, setSheetError] = useState<unknown>(null);
  const [sheetMetadata, setSheetMetadata] = useState<SheetMeta | null>(null);

  const { ensureSheetsTokenAction, showPicker, hasRejectedPermissions } =
    useGoogleSpreadsheetPicker();

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

  // Set sheet lookup error on Formik
  useEffect(
    () => {
      if (getErrorMessage(sheetError).includes("not found")) {
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

      if (sheetMetadata?.id === spreadsheetId) {
        // Already up to date
        return;
      }

      try {
        setSheetError(null);

        if (
          !isNullOrBlank(spreadsheetIdField.value) &&
          sheetMetadata?.id !== spreadsheetId
        ) {
          const properties = await sheets.getSheetProperties(
            spreadsheetIdField.value
          );
          if (!isMounted()) return;
          setSheetMetadata({ id: spreadsheetId, name: properties.title });
        } else {
          setSheetMetadata(null);
        }
      } catch (error) {
        if (!isMounted()) return;
        setSheetMetadata(null);
        setSheetError(error);
        notify.error({ message: "Error retrieving sheet information", error });
      }
    },
    [
      sheetMetadata?.id,
      spreadsheetIdField.value,
      setSheetMetadata,
      setSheetError,
    ]
  );

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
      {sheetMetadata ? (
        // There's a render when doc.name is blank, so we're getting warnings about controlled/uncontrolled components
        <Form.Control
          id={spreadsheetIdField.name}
          type="text"
          disabled
          value={sheetMetadata.name ?? spreadsheetIdField.value ?? ""}
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
        <AsyncButton
          variant="info"
          onClick={async () => {
            try {
              const doc = await showPicker();
              spreadsheetIdFieldHelpers.setValue(doc.id);
              setSheetMetadata(doc);
            } catch (error) {
              // Ensure we're notifying Rollbar
              notify.error({
                message: "Error loading file picker",
                error,
                includeErrorDetails: true,
              });
            }
          }}
        >
          Select
        </AsyncButton>
      </InputGroup.Append>
    </InputGroup>
  );
};

// Ensure Google API is loaded before trying to render widget during mod activation, etc.
export default requireGoogleHOC(SheetsFileWidget);
