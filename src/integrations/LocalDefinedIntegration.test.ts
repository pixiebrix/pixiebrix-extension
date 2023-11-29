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

import automationAnywhere from "@contrib/integrations/automation-anywhere.yaml";
import automationAnywhereOAuth2 from "@contrib/integrations/automation-anywhere-oauth2.yaml";
import greenhouse from "@contrib/integrations/greenhouse.yaml";
import { fromJS } from "@/integrations/LocalDefinedIntegration";
import { BusinessError } from "@/errors/businessErrors";
import {
  type SanitizedConfig,
  type SecretsConfig,
  type IntegrationDefinition,
} from "@/integrations/integrationTypes";

describe("LocalDefinedIntegration", () => {
  test("includes version", () => {
    const integration = fromJS(
      automationAnywhere as unknown as IntegrationDefinition,
    );
    expect(integration.version).toBe("1.0.0");
    expect(integration.uiSchema["ui:order"]).toBeArrayOfSize(5);
  });

  test("get origins for oauth2 integration", () => {
    const integration = fromJS(
      automationAnywhereOAuth2 as unknown as IntegrationDefinition,
    );
    const origins = integration.getOrigins({
      controlRoomUrl: "https://controlroom.example.com",
    } as unknown as SanitizedConfig);

    expect(origins).toEqual([
      "https://controlroom.example.com/*",
      "https://oauthconfigapp.automationanywhere.digital/client/oauth/authorize?hosturl=https://controlroom.example.com&audience=https://controlroom",
      "https://oauthconfigapp.automationanywhere.digital/client/oauth/token",
    ]);
  });

  test("get origins from oauth2 service using custom authConfigOrigin", () => {
    const authConfigOrigin = "https://authconfig.example.com";

    const integration = fromJS(
      automationAnywhereOAuth2 as unknown as IntegrationDefinition,
    );
    const origins = integration.getOrigins({
      controlRoomUrl: "https://controlroom.example.com",
      authConfigOrigin,
    } as unknown as SanitizedConfig);

    expect(origins).toEqual([
      "https://controlroom.example.com/*",
      `${authConfigOrigin}/client/oauth/authorize?hosturl=https://controlroom.example.com&audience=https://controlroom`,
      `${authConfigOrigin}/client/oauth/token`,
    ]);
  });

  test("excludes invalid base URL", () => {
    const integration = fromJS(
      automationAnywhereOAuth2 as unknown as IntegrationDefinition,
    );
    const origins = integration.getOrigins({
      controlRoomUrl: "",
    } as unknown as SanitizedConfig);

    expect(origins).toEqual([
      // `controlRoomUrl` not included because it's not a valid URL
      "https://oauthconfigapp.automationanywhere.digital/client/oauth/authorize?hosturl=&audience=https://controlroom",
      "https://oauthconfigapp.automationanywhere.digital/client/oauth/token",
    ]);
  });

  test("default client ID", () => {
    const integration = fromJS(
      automationAnywhereOAuth2 as unknown as IntegrationDefinition,
    );
    const oauth2 = integration.getOAuth2Context({} as unknown as SecretsConfig);
    expect(oauth2.client_id).toBe("g2qrB2fvyLYbotkb3zi9wwO5qjmje3eM");
  });

  test("custom client ID", () => {
    const clientId = "12345";

    const integration = fromJS(
      automationAnywhereOAuth2 as unknown as IntegrationDefinition,
    );
    const oauth2 = integration.getOAuth2Context({
      clientId,
    } as unknown as SecretsConfig);
    expect(oauth2.client_id).toBe(clientId);
  });
});

describe("LocalDefinedIntegration.authenticateBasicRequest", () => {
  it("adds authorization header", () => {
    const integration = fromJS(greenhouse as unknown as IntegrationDefinition);

    expect(integration.isBasicHttpAuth).toBeTrue();

    const config = integration.authenticateRequest(
      { apiToken: "topsecret" } as unknown as SecretsConfig,
      { url: "/v1/candidates/", method: "get" },
    );

    expect(config.baseURL).toBe("https://harvest.greenhouse.io");

    expect(config.headers).toStrictEqual({
      Authorization: `Basic ${btoa("topsecret:")}`,
    });
  });

  it("requires value", () => {
    const integration = fromJS(greenhouse as unknown as IntegrationDefinition);

    expect(integration.isBasicHttpAuth).toBeTrue();

    expect(() =>
      integration.authenticateRequest(
        { notTheKey: "topsecret" } as unknown as SecretsConfig,
        { url: "/v1/candidates/", method: "get" },
      ),
    ).toThrow(BusinessError);
  });
});
