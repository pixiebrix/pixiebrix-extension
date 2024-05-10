/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import React, { useCallback, useState } from "react";
import { type SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import useGoogleAccount from "@/contrib/google/sheets/core/useGoogleAccount";
import { type SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import useDeriveAsyncState from "@/hooks/useDeriveAsyncState";
import {
  SPREADSHEET_FIELD_DESCRIPTION,
  SPREADSHEET_FIELD_TITLE,
} from "@/contrib/google/sheets/core/schemas";
import { type Schema } from "@/types/schemaTypes";
import AsyncStateGate from "@/components/AsyncStateGate";
import SchemaSelectWidget from "@/components/fields/schemaFields/widgets/SchemaSelectWidget";
import { valueToAsyncState } from "@/utils/asyncStateUtils";
import { AnnotationType } from "@/types/annotationTypes";
import FieldTemplate from "@/components/form/FieldTemplate";
import { type AsyncStateArray } from "@/types/sliceTypes";
import { useField } from "formik";
import { type Expression } from "@/types/runtimeTypes";
import { isExpression } from "@/utils/expressionUtils";
import "./SpreadsheetPickerWidget.module.scss";
import { getAllSpreadsheets } from "@/contrib/google/sheets/core/sheetsApi";

const SpreadsheetPickerWidget: React.FC<SchemaFieldProps> = (props) => {
  const { name, schema: baseSchema } = props;
  const [isSchemaError, setIsSchemaError] = useState(false);
  // Need to lift this into an AsyncState to force the useDeriveAsyncState() call below to
  // recalculate when baseSchema changes
  const baseSchemaAsyncState = valueToAsyncState(baseSchema);
  const googleAccountAsyncState = useGoogleAccount();
  const [{ value }] = useField<string | Expression | undefined>(name);
  const fieldValue = isExpression(value) ? value.__value__ : value;

  const [isRetrying, setIsRetrying] = useState(false);
  const retry = useCallback(async () => {
    if (isRetrying) {
      return;
    }

    setIsRetrying(true);
    googleAccountAsyncState.refetch();
  }, [googleAccountAsyncState, isRetrying]);

  const schemaAsyncState = useDeriveAsyncState<AsyncStateArray, Schema>(
    baseSchemaAsyncState,
    googleAccountAsyncState,
    async (baseSchema: Schema, googleAccount: SanitizedIntegrationConfig) => {
      async function getSchema(): Promise<Schema> {
        if (!googleAccount) {
          return baseSchema;
        }

        const spreadsheetFileList = await getAllSpreadsheets(googleAccount);

        if (
          !spreadsheetFileList.files ||
          spreadsheetFileList.files.length === 0
        ) {
          return baseSchema;
        }

        const spreadsheetSchemaEnum: Schema[] = spreadsheetFileList.files.map(
          (file) => ({
            const: file.id,
            title: file.name,
          }),
        );
        if (baseSchema.oneOf && Array.isArray(baseSchema.oneOf)) {
          // Currently there would only be one item here, the loop makes type narrowing easier
          for (const item of baseSchema.oneOf) {
            if (
              typeof item === "boolean" ||
              spreadsheetSchemaEnum.some(({ const: id }) => id === item.const)
            ) {
              continue;
            }

            spreadsheetSchemaEnum.unshift(item);
          }
        }

        return {
          type: "string",
          title: SPREADSHEET_FIELD_TITLE,
          description: SPREADSHEET_FIELD_DESCRIPTION,
          oneOf: spreadsheetSchemaEnum,
        };
      }

      try {
        const schemaResult = await getSchema();
        // If schema doesn't contain an option in oneOf containing the current
        // value, then add an option with the current value as the value and
        // label, so that the select widget doesn't clear the "invalid" value
        // from the mod automatically.
        if (
          fieldValue != null &&
          schemaResult.type === "string" &&
          schemaResult.oneOf &&
          !schemaResult.oneOf.some(
            (option) =>
              typeof option !== "boolean" && option.const === fieldValue,
          )
        ) {
          schemaResult.oneOf.unshift({
            const: fieldValue,
            title: fieldValue,
          });
        }

        setIsSchemaError(false);
        return schemaResult;
      } catch (error) {
        console.error(error);
        setIsSchemaError(true);
        return {
          type: "string",
          title: SPREADSHEET_FIELD_TITLE,
          description: SPREADSHEET_FIELD_DESCRIPTION,
          enum: [],
        };
      } finally {
        setIsRetrying(false);
      }
    },
  );

  return (
    <AsyncStateGate state={schemaAsyncState} renderLoader={() => null}>
      {({ data: schema }) =>
        isSchemaError ? (
          <FieldTemplate
            name={name}
            disabled
            annotations={[
              {
                message: (
                  <>
                    <p>
                      <strong>Unable to complete Google Authentication</strong>
                    </p>
                    <p>
                      PixieBrix needs to connect to your Google account to use
                      Google Sheets.
                    </p>
                  </>
                ),
                type: AnnotationType.Error,
                actions: [
                  {
                    caption: isRetrying
                      ? "Connecting..."
                      : "Connect Google Account",
                    action: isRetrying ? async () => {} : retry,
                  },
                ],
              },
            ]}
          />
        ) : (
          <SchemaSelectWidget {...props} schema={schema} />
        )
      }
    </AsyncStateGate>
  );
};

export default SpreadsheetPickerWidget;
