/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/// <reference types="gapi.client.sheets" />

import { liftBackground } from "@/background/protocol";
import { ensureAuth, handleRejection } from "@/contrib/google/auth";
type AppendValuesResponse = gapi.client.sheets.AppendValuesResponse;
type BatchGetValuesResponse = gapi.client.sheets.BatchGetValuesResponse;
type BatchUpdateSpreadsheetResponse = gapi.client.sheets.BatchUpdateSpreadsheetResponse;

const GOOGLE_SHEETS_SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

export const DISCOVERY_DOCS = [
  "https://sheets.googleapis.com/$discovery/rest?version=v4",
];

const actionId = (x: string) => `GOOGLE_SHEETS_${x}`;

export const createTab = liftBackground(
  actionId("CREATE_TAB"),
  async (spreadsheetId: string, tabName: string) => {
    const token = await ensureAuth(GOOGLE_SHEETS_SCOPES);
    try {
      return (await gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
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
    } catch (ex) {
      throw await handleRejection(token, ex);
    }
  }
);

export const appendRows = liftBackground(
  actionId("APPEND_ROWS"),
  async (spreadsheetId: string, tabName: string, values: any[]) => {
    const token = await ensureAuth(GOOGLE_SHEETS_SCOPES);
    try {
      return (await gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: spreadsheetId,
        range: tabName,
        valueInputOption: "USER_ENTERED",
        resource: {
          majorDimension: "ROWS",
          values,
        },
      })) as AppendValuesResponse;
    } catch (ex) {
      throw await handleRejection(token, ex);
    }
  }
);

export const batchUpdate = liftBackground(
  actionId("BATCH_UPDATE"),
  async (spreadsheetId: string, requests: any[]) => {
    const token = await ensureAuth(GOOGLE_SHEETS_SCOPES);
    try {
      return (await gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        resource: {
          requests,
        },
      })) as BatchUpdateSpreadsheetResponse;
    } catch (ex) {
      throw await handleRejection(token, ex);
    }
  }
);

export const batchGet = liftBackground(
  actionId("BATCH_GET"),
  async (spreadsheetId: string, ranges: string | string[]) => {
    const token = await ensureAuth(GOOGLE_SHEETS_SCOPES);
    try {
      const sheetRequest = gapi.client.sheets.spreadsheets.values.batchGet({
        spreadsheetId: spreadsheetId,
        ranges,
      });
      return await new Promise<BatchGetValuesResponse>((resolve) =>
        sheetRequest.execute((r) => resolve(r.result))
      );
    } catch (ex) {
      throw await handleRejection(token, ex);
    }
  }
);
