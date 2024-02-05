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

// OAuth
export type UserInfo = gapi.client.oauth2.Userinfo;

// Drive
export type File = gapi.client.drive.File;
export type FileList = gapi.client.drive.FileList;

// Sheets
export type ValueRange = gapi.client.sheets.ValueRange;
export type AppendValuesResponse = gapi.client.sheets.AppendValuesResponse;
export type BatchUpdateSpreadsheetRequest =
  gapi.client.sheets.BatchUpdateSpreadsheetRequest;
export type BatchUpdateSpreadsheetResponse =
  gapi.client.sheets.BatchUpdateSpreadsheetResponse;
export type Spreadsheet = gapi.client.sheets.Spreadsheet;
