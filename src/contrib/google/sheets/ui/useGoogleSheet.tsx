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

import { type Spreadsheet } from "@/contrib/google/sheets/core/types";
import { type Schema } from "@/types/schemaTypes";
import useGoogleAccount from "@/contrib/google/sheets/core/useGoogleAccount";
import useSpreadsheetId from "@/contrib/google/sheets/core/useSpreadsheetId";
import useAsyncState from "@/hooks/useAsyncState";
import { dereference } from "@/validators/generic";
import { BASE_SHEET_SCHEMA } from "@/contrib/google/sheets/core/schemas";
import useDeriveAsyncState from "@/hooks/useDeriveAsyncState";
import { type SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import { sheets } from "@/background/messenger/api";
import { type AsyncState, type FetchableAsyncState } from "@/types/sliceTypes";

type GoogleSheetState = {
  googleAccount: SanitizedIntegrationConfig | null;
  spreadsheet: Spreadsheet | null;
  spreadsheetFieldSchema: Schema;
};

function useGoogleSheet(
  blockConfigPath: string,
): FetchableAsyncState<GoogleSheetState> {
  const googleAccountAsyncState = useGoogleAccount();
  const spreadsheetIdAsyncState = useSpreadsheetId(blockConfigPath);

  const baseSchemaAsyncState = useAsyncState(
    dereference(BASE_SHEET_SCHEMA),
    [],
    {
      initialValue: BASE_SHEET_SCHEMA,
    },
  );

  const resultAsyncState: AsyncState<GoogleSheetState> = useDeriveAsyncState(
    googleAccountAsyncState,
    spreadsheetIdAsyncState,
    baseSchemaAsyncState,
    async (
      googleAccount: SanitizedIntegrationConfig | null,
      spreadsheetId: string | null,
      baseSchema: Schema,
    ) => {
      if (!spreadsheetId) {
        return {
          googleAccount,
          spreadsheet: null,
          spreadsheetFieldSchema: baseSchema,
        };
      }

      const spreadsheet = await sheets.getSpreadsheet({
        googleAccount,
        spreadsheetId,
      });
      return {
        googleAccount,
        spreadsheet,
        spreadsheetFieldSchema: baseSchema,
      };
    },
  );

  return {
    ...resultAsyncState,
    refetch() {
      googleAccountAsyncState.refetch();
    },
  };
}

export default useGoogleSheet;
