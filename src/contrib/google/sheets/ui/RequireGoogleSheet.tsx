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

import React, { type ReactElement, useCallback, useState } from "react";
import { type Spreadsheet } from "@/contrib/google/sheets/core/types";
import { type Schema } from "@/types/schemaTypes";
import useGoogleAccount from "@/contrib/google/sheets/core/useGoogleAccount";
import useSpreadsheetId from "@/contrib/google/sheets/core/useSpreadsheetId";
import useDeriveAsyncState from "@/hooks/useDeriveAsyncState";
import { type SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import { type AsyncState } from "@/types/sliceTypes";
import AsyncStateGate from "@/components/AsyncStateGate";
import { type Except } from "type-fest";
import { joinName } from "@/utils/formUtils";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { AnnotationType } from "@/types/annotationTypes";
import FieldAnnotationAlert from "@/components/annotationAlert/FieldAnnotationAlert";
import { getErrorMessage } from "@/errors/errorHelpers";
import { SHEET_FIELD_SCHEMA } from "@/contrib/google/sheets/core/schemas";
import { getSpreadsheet } from "@/contrib/google/sheets/core/sheetsApi";
import { hasCachedAuthData } from "@/background/messenger/api";

type GoogleSheetState = {
  googleAccount: SanitizedIntegrationConfig | null;
  spreadsheet: Spreadsheet | null;
  spreadsheetFieldSchema: Schema;
};

const RequireGoogleSheet: React.FC<{
  blockConfigPath: string;
  children: (
    props: Except<GoogleSheetState, "spreadsheetFieldSchema">,
  ) => ReactElement;
}> = ({ blockConfigPath, children }) => {
  const googleAccountAsyncState = useGoogleAccount();
  const spreadsheetIdAsyncState = useSpreadsheetId(blockConfigPath);

  const [spreadsheetError, setSpreadsheetError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const retry = useCallback(async () => {
    if (isRetrying) {
      return;
    }

    setIsRetrying(true);
    googleAccountAsyncState.refetch();
  }, [googleAccountAsyncState, isRetrying]);

  const resultAsyncState: AsyncState<GoogleSheetState> = useDeriveAsyncState(
    googleAccountAsyncState,
    spreadsheetIdAsyncState,
    async (
      googleAccount: SanitizedIntegrationConfig | null,
      spreadsheetId: string | null,
    ) => {
      setSpreadsheetError(null);
      if (!googleAccount || !spreadsheetId) {
        return {
          googleAccount,
          spreadsheet: null,
          spreadsheetFieldSchema: SHEET_FIELD_SCHEMA,
        };
      }

      if (await hasCachedAuthData(googleAccount.id)) {
        try {
          // Sheets API will handle legacy authentication when googleAccount is null
          const spreadsheet = await getSpreadsheet({
            googleAccount,
            spreadsheetId,
          });
          return {
            googleAccount,
            spreadsheet,
            spreadsheetFieldSchema: {
              ...SHEET_FIELD_SCHEMA,
              oneOf: [
                {
                  const: spreadsheetId,
                  title: spreadsheet.properties.title,
                },
              ],
            },
          };
        } catch (error) {
          setSpreadsheetError(getErrorMessage(error));
          return {
            googleAccount,
            spreadsheet: null,
            spreadsheetFieldSchema: SHEET_FIELD_SCHEMA,
          };
        } finally {
          setIsRetrying(false);
        }
      }

      return {
        googleAccount,
        spreadsheet: null,
        spreadsheetFieldSchema: SHEET_FIELD_SCHEMA,
      };
    },
  );

  return (
    <AsyncStateGate state={resultAsyncState}>
      {({ data: { spreadsheetFieldSchema, ...others } }) => (
        <>
          {spreadsheetError && (
            <FieldAnnotationAlert
              className="mb-2"
              message={spreadsheetError}
              type={AnnotationType.Error}
              actions={[
                {
                  caption: isRetrying ? "Retrying..." : "Try Again",
                  action: isRetrying ? async () => {} : retry,
                },
              ]}
            />
          )}
          <SchemaField
            name={joinName(blockConfigPath, "spreadsheetId")}
            schema={spreadsheetFieldSchema}
            isRequired
          />
          {children(others)}
        </>
      )}
    </AsyncStateGate>
  );
};

export default RequireGoogleSheet;
