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

import { columnToLetter } from "@/contrib/google/sheets/core/sheetsHelpers";
import { type SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import type { NetworkRequestConfig } from "@/types/networkTypes";
import { handleGoogleRequestRejection } from "@/contrib/google/sheets/core/handleGoogleRequestRejection";
import {
  type AppendValuesResponse,
  type BatchUpdateSpreadsheetRequest,
  type BatchUpdateSpreadsheetResponse,
  type FileList,
  type Spreadsheet,
  type UserInfo,
  type ValueRange,
} from "@/contrib/google/sheets/core/types";
import { getPlatform } from "@/platform/platformContext";
import { assertNotNullish, type Nullishable } from "@/utils/nullishUtils";

const SHEETS_BASE_URL = "https://sheets.googleapis.com/v4/spreadsheets";

/** @internal */
export const DRIVE_BASE_URL = "https://www.googleapis.com/drive/v3/files";

export type SpreadsheetTarget = {
  googleAccount: SanitizedIntegrationConfig | null;
  spreadsheetId: string;
  tabName?: string;
};

async function executeRequest<Response, RequestData = never>(
  requestConfig: NetworkRequestConfig<RequestData>,
  googleAccount: Nullishable<SanitizedIntegrationConfig>,
): Promise<Response> {
  try {
    // XXX: instead of using the implicit platform, might instead choose to wrap all the module methods in a class
    // that takes the platform and googleAccount as a constructor argument
    const result = await getPlatform().request<Response>(
      googleAccount,
      requestConfig,
    );
    return result.data;
  } catch (error) {
    throw await handleGoogleRequestRejection(error, googleAccount);
  }
}

export async function getAllSpreadsheets(
  googleAccount: SanitizedIntegrationConfig | null,
): Promise<FileList> {
  const requestConfig: NetworkRequestConfig<never> = {
    url: DRIVE_BASE_URL,
    method: "get",
    params: {
      q: "mimeType='application/vnd.google-apps.spreadsheet'",
      // Tell the api that this application supports shared items as well as MyDrive items
      supportsAllDrives: true,
      // Include shared items in the results
      includeItemsFromAllDrives: true,
      // Search the 'user' corpus for shared drives
      // See: https://developers.google.com/drive/api/guides/enable-shareddrives#search_for_content_on_a_shared_drive
      corpora: "user",
      // Sort by last modified first, then by name
      orderBy: "modifiedTime desc,name",
    },
  };
  return executeRequest<FileList>(requestConfig, googleAccount);
}

export async function getGoogleUserEmail(
  googleAccount: SanitizedIntegrationConfig,
): Promise<string> {
  const requestConfig: NetworkRequestConfig<never> = {
    url: "https://www.googleapis.com/oauth2/v1/userinfo",
    method: "get",
  };

  const userInfo = await executeRequest<UserInfo>(requestConfig, googleAccount);

  assertNotNullish(userInfo.email, "User email not found in Google response");
  return userInfo.email;
}

async function batchUpdateSpreadsheet(
  { googleAccount, spreadsheetId }: SpreadsheetTarget,
  request: BatchUpdateSpreadsheetRequest,
): Promise<BatchUpdateSpreadsheetResponse> {
  const requestConfig: NetworkRequestConfig<BatchUpdateSpreadsheetRequest> = {
    url: `${SHEETS_BASE_URL}/${spreadsheetId}:batchUpdate`,
    method: "post",
    data: request,
  };
  return executeRequest<
    BatchUpdateSpreadsheetResponse,
    BatchUpdateSpreadsheetRequest
  >(requestConfig, googleAccount);
}

export async function createTab({
  tabName,
  ...target
}: SpreadsheetTarget): Promise<BatchUpdateSpreadsheetResponse> {
  if (!tabName) {
    throw new Error("tabName is required");
  }

  const batchRequest: BatchUpdateSpreadsheetRequest = {
    requests: [
      {
        addSheet: {
          properties: {
            title: tabName,
          },
        },
      },
    ],
  };
  return batchUpdateSpreadsheet(target, batchRequest);
}

export async function appendRows(
  { googleAccount, spreadsheetId, tabName }: SpreadsheetTarget,
  values: unknown[][],
): Promise<AppendValuesResponse> {
  // Note: We currently don't support intermediate empty columns, which would
  // require us to use the batchUpdate endpoint instead of append.
  // See: https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/batchUpdate
  const requestConfig: NetworkRequestConfig<ValueRange> = {
    url: `${SHEETS_BASE_URL}/${spreadsheetId}/values/${tabName}:append`,
    method: "post",
    params: {
      // See: https://developers.google.com/sheets/api/reference/rest/v4/ValueInputOption
      valueInputOption: "USER_ENTERED",
    },
    data: {
      majorDimension: "ROWS",
      values,
    },
  };
  return executeRequest<AppendValuesResponse, ValueRange>(
    requestConfig,
    googleAccount,
  );
}

async function getRows(
  { googleAccount, spreadsheetId, tabName }: SpreadsheetTarget,
  /**
   * A1 notation of the values to retrieve.
   * @see https://developers.google.com/sheets/api/guides/concepts#cell
   */
  range = "",
): Promise<ValueRange> {
  let url = `${SHEETS_BASE_URL}/${spreadsheetId}/values/${tabName}`;
  if (range) {
    url += `!${range}`;
  }

  return executeRequest<ValueRange>({ url, method: "get" }, googleAccount);
}

export async function getAllRows(
  target: SpreadsheetTarget,
): Promise<ValueRange> {
  return getRows(target);
}

export async function getHeaders(target: SpreadsheetTarget): Promise<string[]> {
  // Lookup the headers in the first row
  const { values } = await getRows(target, `A1:${columnToLetter(256)}1`);
  return values?.[0]?.map(String) ?? [];
}

export async function getSpreadsheet({
  googleAccount,
  spreadsheetId,
}: SpreadsheetTarget): Promise<Spreadsheet> {
  // Construct a file mask to return metadata for each sheet (tab) in the spreadsheet, without
  // hydrating the actual grid data for the sheet
  // Note: This only works if spreadsheetId is at the end of the list for some reason ¯\_(ツ)_/¯
  const fileMask =
    "properties(title),sheets.properties(sheetId,title,hidden),spreadsheetId";

  return executeRequest<Spreadsheet>(
    {
      url: `${SHEETS_BASE_URL}/${spreadsheetId}`,
      method: "get",
      params: {
        fields: fileMask,
      },
    },
    googleAccount,
  );
}
