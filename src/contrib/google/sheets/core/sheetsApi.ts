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

import {
  ensureGoogleToken,
  handleGoogleRequestRejection,
  handleLegacyGoogleClientRequestRejection,
} from "@/contrib/google/auth";
import { columnToLetter } from "@/contrib/google/sheets/core/sheetsHelpers";
import { GOOGLE_SHEETS_SCOPES } from "@/contrib/google/sheets/core/sheetsConstants";
import { expectContext } from "@/utils/expectContext";
import initGoogle, {
  isGAPISupported,
  isGoogleInitialized,
  markGoogleInvalidated,
} from "@/contrib/google/initGoogle";
import { type SanitizedIntegrationConfig } from "@/types/integrationTypes";
import { type AxiosRequestConfig } from "axios";
import { proxyService } from "@/background/messenger/api";
import {
  type AppendValuesResponse,
  type BatchUpdateSpreadsheetRequest,
  type BatchUpdateSpreadsheetResponse,
  type FileList,
  type Spreadsheet,
  type SpreadsheetProperties,
  type ValueRange,
} from "@/contrib/google/sheets/core/types";

const SHEETS_BASE_URL = "https://sheets.googleapis.com/v4/spreadsheets";
const DRIVE_BASE_URL = "https://www.googleapis.com/drive/v3/files";

export type SpreadsheetTarget = {
  googleAccount: SanitizedIntegrationConfig | null;
  spreadsheetId: string;
  tabName?: string;
};

/**
 * Ensure GAPI is initialized and return the Google token.
 */
async function _ensureSheetsReadyOnce({
  interactive,
}: {
  interactive: boolean;
}): Promise<string> {
  expectContext("extension");

  if (!isGAPISupported()) {
    throw new Error("Google API not supported by browser");
  }

  if (!isGoogleInitialized()) {
    await initGoogle();
  }

  const token = await ensureGoogleToken(GOOGLE_SHEETS_SCOPES, {
    interactive,
  });

  if (!gapi.client.sheets) {
    markGoogleInvalidated();
    throw new Error("gapi sheets module not loaded");
  }

  return token;
}

export async function ensureSheetsReady({
  maxRetries = 3,
  interactive,
}: {
  maxRetries?: number;
  interactive: boolean;
}): Promise<string> {
  let retry = 0;
  let lastError;

  do {
    try {
      // eslint-disable-next-line no-await-in-loop -- retry loop
      return await _ensureSheetsReadyOnce({ interactive });
    } catch (error) {
      console.error("Error ensuring Google Sheets API ready", error, {
        retry,
      });
      lastError = error;
      retry++;
    }
  } while (retry < maxRetries);

  throw lastError;
}

async function executeRequest<Response, RequestData = never>(
  requestConfig: AxiosRequestConfig<RequestData>,
  googleAccount: SanitizedIntegrationConfig | null
): Promise<Response> {
  let legacyClientToken: string | null = null;

  if (!googleAccount) {
    legacyClientToken = await ensureSheetsReady({ interactive: false });
    // Fall-back to using the token from ensureSheetsReady
    requestConfig.headers = {
      Authorization: `Bearer ${legacyClientToken}`,
    };
  }

  try {
    const result = await proxyService<Response>(googleAccount, requestConfig);
    return result.data;
  } catch (error) {
    throw await handleGoogleRequestRejection(
      error,
      googleAccount,
      legacyClientToken
    );
  }
}

export async function getAllSpreadsheets(
  googleAccount: SanitizedIntegrationConfig | null
): Promise<FileList> {
  const requestConfig: AxiosRequestConfig<never> = {
    url: `${DRIVE_BASE_URL}?q=mimeType='application/vnd.google-apps.spreadsheet'`,
    method: "get",
  };
  return executeRequest<FileList>(requestConfig, googleAccount);
}

async function batchUpdateSpreadsheet(
  { googleAccount, spreadsheetId }: SpreadsheetTarget,
  request: BatchUpdateSpreadsheetRequest
): Promise<BatchUpdateSpreadsheetResponse> {
  const requestConfig: AxiosRequestConfig<BatchUpdateSpreadsheetRequest> = {
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
  values: unknown[][]
): Promise<AppendValuesResponse> {
  const requestConfig: AxiosRequestConfig<ValueRange> = {
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
    googleAccount
  );
}

async function getRows(
  { googleAccount, spreadsheetId, tabName }: SpreadsheetTarget,
  /**
   * A1 notation of the values to retrieve.
   * @see: https://developers.google.com/sheets/api/guides/concepts#cell
   */
  range = ""
): Promise<ValueRange> {
  let url = `${SHEETS_BASE_URL}/${spreadsheetId}/values/${tabName}`;
  if (range) {
    url += `!${range}`;
  }

  return executeRequest<ValueRange>({ url, method: "get" }, googleAccount);
}

export async function getAllRows(
  target: SpreadsheetTarget
): Promise<ValueRange> {
  return getRows(target);
}

export async function getHeaders(target: SpreadsheetTarget): Promise<string[]> {
  // Lookup the headers in the first row
  const { values } = await getRows(target, `A1:${columnToLetter(256)}1`);
  return values[0]?.map(String);
}

export async function getSpreadsheet({
  googleAccount,
  spreadsheetId,
}: SpreadsheetTarget): Promise<Spreadsheet> {
  // Construct a file mask to return metadata for each sheet (tab) in the spreadsheet, without
  // hydrating the actual grid data for the sheet
  const fileMask = "properties(title),sheets.properties(sheetId,title)";

  return executeRequest<Spreadsheet>(
    {
      url: `${SHEETS_BASE_URL}/${spreadsheetId}`,
      method: "get",
      params: {
        fields: fileMask,
      },
    },
    googleAccount
  );
}

/**
 * @deprecated use getAllSpreadsheets() or getSpreadsheet() instead
 */
export async function getSheetProperties(
  spreadsheetId: string
): Promise<SpreadsheetProperties> {
  const token = await ensureSheetsReady({ interactive: false });

  try {
    const sheetRequest = gapi.client.sheets.spreadsheets.get({
      spreadsheetId,
      fields: "properties",
    });
    const spreadsheet = await new Promise<Spreadsheet>((resolve, reject) => {
      // TODO: Find a better solution than casting to any
      sheetRequest.execute((r: any) => {
        // Response in practice doesn't match the type signature
        console.debug("Got spreadsheet response", r);
        if (r.code >= 300) {
          reject(
            new Error(
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
              r.message ?? `Google sheets request failed with status: ${r.code}`
            )
          );
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        resolve(r.result);
      });
    });

    if (!spreadsheet) {
      throw new Error("Unknown error fetching spreadsheet");
    }

    return spreadsheet.properties;
  } catch (error) {
    throw await handleLegacyGoogleClientRequestRejection(token, error);
  }
}

/**
 * @deprecated use getAllSpreadsheets() or getSpreadsheet() instead
 */
export async function getTabNames(spreadsheetId: string): Promise<string[]> {
  const token = await ensureSheetsReady({ interactive: false });

  try {
    const sheetRequest = gapi.client.sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties",
    });
    const spreadsheet = await new Promise<Spreadsheet>((resolve, reject) => {
      // TODO: Find a better solution than casting to any
      sheetRequest.execute((r: any) => {
        // Response in practice doesn't match the type signature
        console.debug("Got spreadsheet response", r);
        if (r.code >= 300) {
          reject(
            new Error(
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
              r.message ?? `Google sheets request failed with status: ${r.code}`
            )
          );
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        resolve(r.result);
      });
    });
    if (!spreadsheet) {
      throw new Error("Unknown error fetching spreadsheet");
    }

    return spreadsheet.sheets.map((x) => x.properties.title);
  } catch (error) {
    throw await handleLegacyGoogleClientRequestRejection(token, error);
  }
}
