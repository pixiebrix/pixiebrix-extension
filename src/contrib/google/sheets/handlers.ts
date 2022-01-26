/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { ensureAuth, handleRejection } from "@/contrib/google/auth";
import { columnToLetter } from "@/contrib/google/sheets/sheetsHelpers";

type AppendValuesResponse = gapi.client.sheets.AppendValuesResponse;
type BatchGetValuesResponse = gapi.client.sheets.BatchGetValuesResponse;
type BatchUpdateSpreadsheetResponse = gapi.client.sheets.BatchUpdateSpreadsheetResponse;
type Spreadsheet = gapi.client.sheets.Spreadsheet;
type SpreadsheetProperties = gapi.client.sheets.SpreadsheetProperties;

// https://developers.google.com/sheets/api/guides/authorizing
export const GOOGLE_SHEETS_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
];

export const DISCOVERY_DOCS = [
  "https://sheets.googleapis.com/$discovery/rest?version=v4",
];

export async function createTab(spreadsheetId: string, tabName: string) {
  const token = await ensureAuth(GOOGLE_SHEETS_SCOPES);
  try {
    return (await gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            addSheet: {
              properties: {
                title: tabName,
              },
            },
          },
        ],
      },
    })) as BatchUpdateSpreadsheetResponse;
  } catch (error) {
    throw await handleRejection(token, error);
  }
}

export async function appendRows(
  spreadsheetId: string,
  tabName: string,
  values: any[]
) {
  const token = await ensureAuth(GOOGLE_SHEETS_SCOPES);
  try {
    return (await gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: tabName,
      valueInputOption: "USER_ENTERED",
      resource: {
        majorDimension: "ROWS",
        values,
      },
    })) as AppendValuesResponse;
  } catch (error) {
    throw await handleRejection(token, error);
  }
}

export async function batchUpdate(spreadsheetId: string, requests: any[]) {
  const token = await ensureAuth(GOOGLE_SHEETS_SCOPES);
  try {
    return (await gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests,
      },
    })) as BatchUpdateSpreadsheetResponse;
  } catch (error) {
    throw await handleRejection(token, error);
  }
}

export async function batchGet(
  spreadsheetId: string,
  ranges: string | string[]
) {
  const token = await ensureAuth(GOOGLE_SHEETS_SCOPES);
  try {
    const sheetRequest = gapi.client.sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges,
    });
    return await new Promise<BatchGetValuesResponse>((resolve, reject) => {
      sheetRequest.execute((r) => {
        if (r.status >= 300 || (r as any).code >= 300) {
          reject(r);
        } else {
          resolve(r.result);
        }
      });
    });
  } catch (error) {
    throw await handleRejection(token, error);
  }
}

export async function getSheetProperties(
  spreadsheetId: string
): Promise<SpreadsheetProperties> {
  const token = await ensureAuth(GOOGLE_SHEETS_SCOPES);

  if (!gapi.client.sheets) {
    throw new Error("gapi sheets module not loaded");
  }

  try {
    const sheetRequest = gapi.client.sheets.spreadsheets.get({
      spreadsheetId,
      fields: "properties",
    });
    const spreadsheet = await new Promise<Spreadsheet>((resolve, reject) => {
      sheetRequest.execute((r: any) => {
        // Response in practice doesn't match the type signature
        console.debug("Got spreadsheet response", r);
        if (r.code >= 300) {
          reject(
            new Error(
              r.message ?? `Google sheets request failed with status: ${r.code}`
            )
          );
        }

        resolve(r.result);
      });
    });
    if (!spreadsheet) {
      throw new Error("Unknown error fetching spreadsheet");
    }

    return spreadsheet.properties;
  } catch (error) {
    throw await handleRejection(token, error);
  }
}

export async function getTabNames(spreadsheetId: string): Promise<string[]> {
  const token = await ensureAuth(GOOGLE_SHEETS_SCOPES);

  if (!gapi.client.sheets) {
    throw new Error("gapi sheets module not loaded");
  }

  try {
    const sheetRequest = gapi.client.sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties",
    });
    const spreadsheet = await new Promise<Spreadsheet>((resolve, reject) => {
      sheetRequest.execute((r: any) => {
        // Response in practice doesn't match the type signature
        console.debug("Got spreadsheet response", r);
        if (r.code >= 300) {
          reject(
            new Error(
              r.message ?? `Google sheets request failed with status: ${r.code}`
            )
          );
        }

        resolve(r.result);
      });
    });
    if (!spreadsheet) {
      throw new Error("Unknown error fetching spreadsheet");
    }

    return spreadsheet.sheets.map((x) => x.properties.title);
  } catch (error) {
    throw await handleRejection(token, error);
  }
}

export async function getHeaders({
  spreadsheetId,
  tabName,
}: {
  spreadsheetId: string;
  tabName: string;
}): Promise<string[]> {
  // Lookup the headers in the first row so we can determine where to put the values
  const response = await batchGet(
    spreadsheetId,
    `${tabName}!A1:${columnToLetter(256)}1`
  );
  return response.valueRanges?.[0].values?.[0] ?? [];
}
