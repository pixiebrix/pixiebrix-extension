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
} from "@/contrib/google/auth";
import { columnToLetter } from "@/contrib/google/sheets/sheetsHelpers";
import { GOOGLE_SHEETS_SCOPES } from "@/contrib/google/sheets/sheetsConstants";
import { expectContext } from "@/utils/expectContext";
import initGoogle, {
  isGAPISupported,
  isGoogleInitialized,
  markGoogleInvalidated,
} from "@/contrib/google/initGoogle";
import { type SanitizedServiceConfiguration } from "@/types/serviceTypes";
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
} from "@/contrib/google/sheets/types";

const SHEETS_BASE_URL = "https://sheets.googleapis.com/v4/spreadsheets";
const DRIVE_BASE_URL = "https://www.googleapis.com/drive/v3/files";

export type SpreadsheetTarget = {
  googleAccount: SanitizedServiceConfiguration | null;
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

export async function getAllSpreadsheets(
  googleAccount: SanitizedServiceConfiguration | null
): Promise<FileList> {
  const token = await ensureSheetsReady({ interactive: false });

  const requestConfig: AxiosRequestConfig = {
    url: `${DRIVE_BASE_URL}?q=mimeType='application/vnd.google-apps.spreadsheet'`,
    method: "get",
  };

  if (!googleAccount) {
    // Fall-back to using the token from ensureSheetsReady
    requestConfig.headers = {
      Authorization: `Bearer ${token}`,
    };
  }

  try {
    const { data } = await proxyService<FileList>(googleAccount, requestConfig);
    return data;
  } catch (error) {
    throw await handleGoogleRequestRejection(token, error);
  }
}

async function batchUpdateSpreadsheet(
  { googleAccount, spreadsheetId }: SpreadsheetTarget,
  request: BatchUpdateSpreadsheetRequest
): Promise<BatchUpdateSpreadsheetResponse> {
  const token = await ensureSheetsReady({ interactive: false });

  const requestConfig: AxiosRequestConfig = {
    url: `${SHEETS_BASE_URL}/${spreadsheetId}:batchUpdate`,
    method: "post",
    data: request,
  };

  if (!googleAccount) {
    // Fall-back to using the token from ensureSheetsReady
    requestConfig.headers = {
      Authorization: `Bearer ${token}`,
    };
  }

  try {
    const { data } = await proxyService<BatchUpdateSpreadsheetResponse>(
      googleAccount,
      requestConfig
    );
    return data;
  } catch (error) {
    throw await handleGoogleRequestRejection(token, error);
  }
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
  const token = await ensureSheetsReady({ interactive: false });

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

  if (!googleAccount) {
    // Fall-back to using the token from ensureSheetsReady
    requestConfig.headers = {
      Authorization: `Bearer ${token}`,
    };
  }

  try {
    const { data } = await proxyService<AppendValuesResponse>(
      googleAccount,
      requestConfig
    );
    return data;
  } catch (error) {
    throw await handleGoogleRequestRejection(token, error);
  }
}

async function getRows(
  { googleAccount, spreadsheetId, tabName }: SpreadsheetTarget,
  /**
   * A1 notation of the values to retrieve.
   * @see: https://developers.google.com/sheets/api/guides/concepts#cell
   */
  range = ""
): Promise<ValueRange> {
  const token = await ensureSheetsReady({ interactive: false });

  let url = `${SHEETS_BASE_URL}/${spreadsheetId}/values/${tabName}`;
  if (range) {
    url += `!${range}`;
  }

  const requestConfig: AxiosRequestConfig = { url, method: "get" };

  if (!googleAccount) {
    // Fall-back to using the token from ensureSheetsReady
    requestConfig.headers = {
      Authorization: `Bearer ${token}`,
    };
  }

  /* Example of old error handling, not sure if needed:
  return await new Promise<BatchGetValuesResponse>((resolve, reject) => {
      sheetRequest.execute((r) => {
        if (r.status >= 300 || (r as any).code >= 300) {
          reject(r);
        } else {
          resolve(r.result);
        }
      });
    });
   */

  try {
    const { data } = await proxyService<ValueRange>(
      googleAccount,
      requestConfig
    );
    return data;
  } catch (error) {
    throw await handleGoogleRequestRejection(token, error);
  }
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
  const token = await ensureSheetsReady({ interactive: false });

  const requestConfig: AxiosRequestConfig = {
    url: `${SHEETS_BASE_URL}/${spreadsheetId}`,
    method: "get",
  };

  if (!googleAccount) {
    // Fall-back to using the token from ensureSheetsReady
    requestConfig.headers = {
      Authorization: `Bearer ${token}`,
    };
  }

  try {
    const { data } = await proxyService<Spreadsheet>(
      googleAccount,
      requestConfig
    );
    return data;
  } catch (error) {
    throw await handleGoogleRequestRejection(token, error);
  }
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
    throw await handleGoogleRequestRejection(token, error);
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
    throw await handleGoogleRequestRejection(token, error);
  }
}
