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

// This mock file provides reasonable defaults for the methods in the background messenger API

/* Do not use `registerMethod` in this file */
import { backgroundTarget as bg, getMethod } from "webext-messenger";
import type { AxiosRequestConfig } from "axios";
import type { RemoteResponse } from "@/types/contract";
import { SanitizedIntegrationConfig } from "@/integrations/integrationTypes";

// Use relative path to bypass auto-mocks
export * from "../../../../background/messenger/api";

export const pong = jest.fn(() => ({
  timestamp: Date.now(),
}));

export const clearServiceCache = jest.fn();
export const sheets = {
  isLoggedIn: jest.fn().mockRejectedValue(new Error("Not implemented")),
  getAllSpreadsheets: jest.fn().mockRejectedValue(new Error("Not implemented")),
  getSpreadsheet: jest.fn().mockRejectedValue(new Error("Not implemented")),
  getTabNames: jest.fn().mockRejectedValue(new Error("Not implemented")),
  getSheetProperties: jest.fn().mockRejectedValue(new Error("Not implemented")),
  getHeaders: jest.fn().mockRejectedValue(new Error("Not implemented")),
  getAllRows: jest.fn().mockRejectedValue(new Error("Not implemented")),
  createTab: getMethod("GOOGLE_SHEETS_CREATE_TAB", bg),
  appendRows: getMethod("GOOGLE_SHEETS_APPEND_ROWS", bg),
};

export const dataStore = {
  get: jest.fn().mockRejectedValue(new Error("Not implemented in mock")),
  set: getMethod("SET_DATA_STORE", bg),
};

export const services = {
  locateAllForId: jest.fn().mockResolvedValue([]),
  locate: jest
    .fn()
    .mockRejectedValue(new Error("Locate not implemented in mock")),
  refresh: jest.fn(),
  refreshLocal: getMethod("LOCATOR_REFRESH_LOCAL", bg),
};

// `getMethod` currently strips generics, so we must copy the function signature here
export const performConfiguredRequestInBackground = getMethod(
  "CONFIGURED_REQUEST",
  bg,
) as <TData>(
  integrationConfig: SanitizedIntegrationConfig | null,
  requestConfig: AxiosRequestConfig,
) => Promise<RemoteResponse<TData>>;
