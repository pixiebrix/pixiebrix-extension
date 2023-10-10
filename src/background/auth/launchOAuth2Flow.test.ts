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

import { integrationConfigFactory } from "@/testUtils/factories/integrationFactories";
import { registryIdFactory } from "@/testUtils/factories/stringFactories";
import {
  type IntegrationABC,
  type OAuth2Context,
  type SecretsConfig,
} from "@/types/integrationTypes";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { launchOAuth2Flow } from "@/background/auth/launchOAuth2Flow";
import codeGrantFlow from "@/background/auth/codeGrantFlow";

jest.mock("@/background/auth/codeGrantFlow", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const codeGrantFlowMock = jest.mocked(codeGrantFlow);

jest.mock("@/background/auth/implicitGrantFlow", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const reportEventMock = jest.mocked(reportEvent);

describe("oauth2 event reporting", () => {
  beforeEach(() => {
    reportEventMock.mockReset();
  });

  it("reports start and success", async () => {
    const oauth2Context: OAuth2Context = {
      host: "www.fakehost.com",
      authorizeUrl: "https://www.authorize.url",
      tokenUrl: "https://www.token.url",
      client_id: "fake_client_id",
    };
    const integration = {
      id: registryIdFactory(),
      isOAuth2: true,
      getOAuth2Context: (secrets: SecretsConfig) => oauth2Context,
    } as unknown as IntegrationABC;
    const auth = integrationConfigFactory({
      label: "test auth label",
    });
    await launchOAuth2Flow(integration, auth);

    const expectedEventPayload = {
      integration_id: integration.id,
      auth_label: auth.label,
      host: oauth2Context.host,
      client_id: oauth2Context.client_id,
      authorize_url: oauth2Context.authorizeUrl,
      token_url: oauth2Context.tokenUrl,
    };

    expect(reportEventMock).toHaveBeenCalledTimes(2);
    expect(reportEventMock).toHaveBeenCalledWith(
      Events.OAUTH2_LOGIN_START,
      expectedEventPayload
    );
    expect(reportEventMock).toHaveBeenCalledWith(
      Events.OAUTH2_LOGIN_SUCCESS,
      expectedEventPayload
    );
  });

  it("reports start and error", async () => {
    const oauth2Context: OAuth2Context = {
      host: "www.fakehost.com",
      authorizeUrl: "https://www.authorize.url",
      tokenUrl: "https://www.token.url",
      client_id: "fake_client_id",
    };
    const integration = {
      id: registryIdFactory(),
      isOAuth2: true,
      getOAuth2Context: (secrets: SecretsConfig) => oauth2Context,
    } as unknown as IntegrationABC;
    const auth = integrationConfigFactory({
      label: "test auth label",
    });

    const error = new Error("test error");
    codeGrantFlowMock.mockRejectedValueOnce(error);
    await expect(launchOAuth2Flow(integration, auth)).rejects.toThrow(error);

    const expectedEventPayload = {
      integration_id: integration.id,
      auth_label: auth.label,
      host: oauth2Context.host,
      client_id: oauth2Context.client_id,
      authorize_url: oauth2Context.authorizeUrl,
      token_url: oauth2Context.tokenUrl,
    };

    expect(reportEventMock).toHaveBeenCalledTimes(2);
    expect(reportEventMock).toHaveBeenCalledWith(
      Events.OAUTH2_LOGIN_START,
      expectedEventPayload
    );
    expect(reportEventMock).toHaveBeenCalledWith(Events.OAUTH2_LOGIN_ERROR, {
      ...expectedEventPayload,
      error_message: error.message,
    });
  });
});
