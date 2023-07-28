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

import React, { type ReactElement } from "react";
import { type Spreadsheet } from "@/contrib/google/sheets/core/types";
import { type Schema } from "@/types/schemaTypes";
import useGoogleAccount from "@/contrib/google/sheets/core/useGoogleAccount";
import useSpreadsheetId from "@/contrib/google/sheets/core/useSpreadsheetId";
import useAsyncState from "@/hooks/useAsyncState";
import { dereference } from "@/validators/generic";
import {
  BASE_SHEET_SCHEMA,
  SPREADSHEET_FIELD_DESCRIPTION,
  SPREADSHEET_FIELD_TITLE,
} from "@/contrib/google/sheets/core/schemas";
import useDeriveAsyncState from "@/hooks/useDeriveAsyncState";
import { type SanitizedIntegrationConfig } from "@/types/integrationTypes";
import { sheets } from "@/background/messenger/api";
import { isEmpty } from "lodash";
import { type AsyncState } from "@/types/sliceTypes";
import AsyncStateGate from "@/components/AsyncStateGate";

type GoogleSheetState = {
  googleAccount: SanitizedIntegrationConfig | null;
  spreadsheet: Spreadsheet;
  schema: Schema;
};

const RequireGoogleSheet: React.FC<{
  blockConfigPath: string;
  children: (props: GoogleSheetState) => ReactElement;
}> = ({ blockConfigPath, children }) => {
  const googleAccountAsyncState = useGoogleAccount(blockConfigPath);
  const spreadsheetIdAsyncState = useSpreadsheetId(blockConfigPath);

  const baseSchemaAsyncState = useAsyncState(
    dereference(BASE_SHEET_SCHEMA),
    [],
    {
      initialValue: BASE_SHEET_SCHEMA,
    }
  );

  const spreadsheetSchemaState = useDeriveAsyncState(
    googleAccountAsyncState,
    baseSchemaAsyncState,
    async (
      googleAccount: SanitizedIntegrationConfig | null,
      baseSchema: Schema
    ) => {
      if (googleAccount == null) {
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

  const spreadsheetAsyncState = useDeriveAsyncState(
    googleAccountAsyncState,
    spreadsheetIdAsyncState,
    // Include spreadsheetSchemaState here to block and prevent double-call to
    // Google sheets api before the user has completed Google login
    spreadsheetSchemaState,
    async (
      googleAccount: SanitizedIntegrationConfig | null,
      spreadsheetId: string | null
    ) => {
      if (spreadsheetId == null) {
        return null;
      }

      // Sheets api handles fallback situation when googleAccount is null
      return sheets.getSpreadsheet({
        googleAccount,
        spreadsheetId,
      });
    }
  );

  const resultAsyncState: AsyncState<GoogleSheetState> = useDeriveAsyncState(
    googleAccountAsyncState,
    spreadsheetAsyncState,
    spreadsheetSchemaState,
    async (
      googleAccount: SanitizedIntegrationConfig | null,
      spreadsheet: Spreadsheet,
      schema
    ) => ({
      googleAccount,
      spreadsheet,
      schema,
    })
  );

  return (
    <AsyncStateGate state={resultAsyncState}>
      {({ data }) => children(data)}
    </AsyncStateGate>
  );
};

export default RequireGoogleSheet;
