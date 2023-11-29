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
  DRIVE_BASE_URL,
  getAllSpreadsheets,
} from "@/contrib/google/sheets/core/sheetsApi";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import { performConfiguredRequest as realProxyService } from "@/background/requests";
import { performConfiguredRequestInBackground as apiProxyService } from "@/background/messenger/api";
import { integrationConfigFactory } from "@/testUtils/factories/integrationFactories";
import { locator } from "@/background/locator";
import googleDefinition from "@contrib/integrations/google-oauth2-pkce.yaml";
import { fromJS } from "@/integrations/LocalDefinedIntegration";
import { readRawConfigurations } from "@/integrations/registry";
import { type IntegrationConfig } from "@/integrations/integrationTypes";

import {
  deleteCachedAuthData,
  getCachedAuthData,
  setCachedAuthData,
} from "@/background/auth/authStorage";

const axiosMock = new MockAdapter(axios);

const googleIntegration = fromJS(googleDefinition as any);

jest.mock("@/background/auth/authStorage", () => ({
  ...jest.requireActual("@/background/auth/authStorage"),
  deleteCachedAuthData: jest.fn(),
}));

// Wire up proxyService to the real implementation
jest.mocked(apiProxyService).mockImplementation(realProxyService);
const readRawConfigurationsMock = jest.mocked(readRawConfigurations);
const deleteCachedAuthDataMock = jest.mocked(deleteCachedAuthData);

jest.mock("@/integrations/registry", () => {
  const actual = jest.requireActual("@/integrations/registry");

  return {
    ...actual,
    readRawConfigurations: jest
      .fn()
      .mockRejectedValue(
        new Error("Implement readRawConfigurations mock in test"),
      ),
    lookup: jest.fn(async (id: string) => {
      if (id === googleIntegration.id) {
        return googleIntegration;
      }

      throw new Error(`Integration id not mocked: ${id}`);
    }),
  };
});

describe("error handling", () => {
  let integrationConfig: IntegrationConfig;

  beforeEach(async () => {
    axiosMock.reset();
    axiosMock.resetHistory();

    integrationConfig = integrationConfigFactory({
      integrationId: googleIntegration.id,
    });

    // No remote integration configurations
    axiosMock.onGet("/api/services/shared/").reply(200, []);

    readRawConfigurationsMock.mockResolvedValue([integrationConfig]);

    deleteCachedAuthDataMock.mockReset();

    await locator.refresh();
  });

  it("Returns permissions error for 404 message with google integration", async () => {
    // Google Request
    axiosMock.onGet().reply(404);

    const config = await locator.locate(
      googleIntegration.id,
      integrationConfig.id,
    );

    await setCachedAuthData(integrationConfig.id, {
      access_token: "NOTAREALTOKEN",
    });

    await expect(getAllSpreadsheets(config)).rejects.toThrow(
      "Cannot locate the Google Drive resource. Have you been granted access?",
    );

    // Don't clear the token, because the token is valid the user just might not have access
    expect(deleteCachedAuthDataMock).not.toHaveBeenCalledOnce();
  });

  it("Returns bad request error", async () => {
    // Google Request
    axiosMock.onGet().reply(400);

    const config = await locator.locate(
      googleIntegration.id,
      integrationConfig.id,
    );

    await setCachedAuthData(integrationConfig.id, {
      access_token: "NOTAREALTOKEN",
    });

    await expect(getAllSpreadsheets(config)).rejects.toThrow(
      // Generic Bad Request error based on status code
      "Bad Request",
    );

    expect(deleteCachedAuthDataMock).not.toHaveBeenCalledOnce();
  });

  it.each([
    {
      status: 401,
      message:
        "Permission denied, re-authenticate with Google and try again. Details: Unauthorized",
    },
    {
      status: 403,
      message:
        "You do not have permission to access the Google Drive resource. Have you been granted access? If this resource is public, you need to open it in a separate browser tab before it will appear here.",
    },
  ])(
    "Returns permissions error on $status if no refresh token",
    async ({ status, message }: { status: number; message: string }) => {
      // Google Request
      axiosMock.onGet().reply(status);

      const config = await locator.locate(
        googleIntegration.id,
        integrationConfig.id,
      );

      await setCachedAuthData(integrationConfig.id, {
        access_token: "NOTAREALTOKEN",
      });

      await expect(getAllSpreadsheets(config)).rejects.toThrow(message);

      expect(await getCachedAuthData(integrationConfig.id)).toStrictEqual({
        access_token: "NOTAREALTOKEN",
      });
      expect(deleteCachedAuthDataMock).toHaveBeenCalledOnce();

      expect(
        axiosMock.history.get.filter((x) => x.url.startsWith(DRIVE_BASE_URL)),
      ).toHaveLength(2);
      expect(axiosMock.history.post).toHaveLength(0);
    },
  );

  it.each([
    {
      status: 401,
      message:
        "Permission denied, re-authenticate with Google and try again. Details: Unauthorized",
    },
    {
      status: 403,
      message:
        "You do not have permission to access the Google Drive resource. Have you been granted access? If this resource is public, you need to open it in a separate browser tab before it will appear here.",
    },
  ])(
    "Returns permissions error on $status if token refresh fails",
    async ({ status, message }: { status: number; message: string }) => {
      // Google Requests
      axiosMock.onGet().reply(status);
      axiosMock.onPost().reply(401);

      const config = await locator.locate(
        googleIntegration.id,
        integrationConfig.id,
      );

      await setCachedAuthData(integrationConfig.id, {
        access_token: "NOTAREALTOKEN",
        refresh_token: "NOTAREALREFRESHTOKEN",
      });

      await expect(getAllSpreadsheets(config)).rejects.toThrow(message);

      expect(await getCachedAuthData(integrationConfig.id)).toStrictEqual({
        access_token: "NOTAREALTOKEN",
        refresh_token: "NOTAREALREFRESHTOKEN",
      });
      expect(deleteCachedAuthDataMock).toHaveBeenCalledOnce();

      expect(
        axiosMock.history.get.filter((x) => x.url.startsWith(DRIVE_BASE_URL)),
      ).toHaveLength(2);
      expect(axiosMock.history.post).toHaveLength(1);
    },
  );

  it.each([401, 403])(
    "Retries response on %s if token refresh succeeds",
    async (status: number) => {
      // Google Requests: Assume the first GET fails because the access token is expired. The second GET succeeds
      // after the token is refreshed.
      axiosMock.onGet().replyOnce(status).onGet().replyOnce(200);
      axiosMock.onPost().reply(200, {
        access_token: "NOTAREALTOKEN2",
        refresh_token: "NOTAREALREFRESHTOKEN2",
      });

      const config = await locator.locate(
        googleIntegration.id,
        integrationConfig.id,
      );

      await setCachedAuthData(integrationConfig.id, {
        access_token: "NOTAREALTOKEN",
        refresh_token: "NOTAREALREFRESHTOKEN",
      });

      await getAllSpreadsheets(config);

      expect(await getCachedAuthData(integrationConfig.id)).toStrictEqual({
        access_token: "NOTAREALTOKEN2",
        refresh_token: "NOTAREALREFRESHTOKEN2",
      });
      expect(deleteCachedAuthDataMock).not.toHaveBeenCalled();

      const googleGetRequests = axiosMock.history.get.filter((x) =>
        x.url.startsWith(DRIVE_BASE_URL),
      );
      expect(googleGetRequests).toHaveLength(2);
      expect(googleGetRequests[0].headers.Authorization).toBe(
        "Bearer NOTAREALTOKEN",
      );
      expect(googleGetRequests[1].headers.Authorization).toBe(
        "Bearer NOTAREALTOKEN2",
      );
      expect(axiosMock.history.post).toHaveLength(1);
    },
  );
});
