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
  ensureSheetsReady,
  getAllSpreadsheets,
} from "@/contrib/google/sheets/handlers";
import { ensureGoogleToken } from "@/contrib/google/auth";
import MockAdapter from "axios-mock-adapter";
import axios, { type AxiosRequestConfig } from "axios";
import { proxyService as realProxyService } from "@/background/requests";
import { proxyService as apiProxyService } from "@/background/messenger/api";
import { sanitizedIntegrationConfigFactory } from "@/testUtils/factories/integrationFactories";
import {
  type IntegrationABC,
  type SecretsConfig,
} from "@/types/integrationTypes";

jest.mock("@/contrib/google/initGoogle", () => ({
  isGoogleInitialized: jest.fn().mockReturnValue(true),
  isGAPISupported: jest.fn().mockReturnValue(true),
  subscribe: jest.fn().mockImplementation(() => () => {}),
}));

jest.mock("@/contrib/google/auth", () => {
  const actual = jest.requireActual("@/contrib/google/auth");
  return {
    ...actual,
    ensureGoogleToken: jest.fn().mockResolvedValue("NOTAREALTOKEN"),
  };
});

// Mock out the gapi object
(globalThis.gapi as any) = {
  client: {
    sheets: {},
  },
};

const ensureGoogleTokenMock = jest.mocked(ensureGoogleToken);

describe("ensureSheetsReady", () => {
  beforeEach(() => {
    ensureGoogleTokenMock.mockResolvedValue("NOTAREALTOKEN");
    ensureGoogleTokenMock.mockClear();
  });

  it("success", async () => {
    await expect(ensureSheetsReady({ interactive: false })).toResolve();
    expect(ensureGoogleTokenMock).toHaveBeenCalledTimes(1);
  });

  it("retries 3 times", async () => {
    ensureGoogleTokenMock.mockRejectedValue(new Error("test error"));
    await expect(ensureSheetsReady({ interactive: false })).rejects.toThrow(
      Error
    );
    expect(ensureGoogleTokenMock).toHaveBeenCalledTimes(3);
  });
});

const axiosMock = new MockAdapter(axios);

// Wire up proxyService to the real implementation
jest.mocked(apiProxyService).mockImplementation(realProxyService);

jest.mock("@/services/registry", () => {
  const actual = jest.requireActual("@/services/registry");

  return {
    ...actual,
    lookup: jest.fn(
      async (id) =>
        ({
          id,
          name: "Test GSheets Service",
          isOAuth2: true,
          isToken: false,
          authenticateRequest: (
            serviceConfig: SecretsConfig,
            requestConfig: AxiosRequestConfig
          ) => requestConfig,
        } as IntegrationABC)
    ),
  };
});

describe("error handling", () => {
  beforeEach(() => {
    axiosMock.reset();
  });

  it("Returns permissions error for 404 with google integration", async () => {
    axiosMock.onGet().reply(404);
    const googleAccount = sanitizedIntegrationConfigFactory();

    await expect(getAllSpreadsheets(googleAccount)).rejects.toThrow(
      "Cannot locate the Google drive resource. Have you been granted access?"
    );
  });
});
