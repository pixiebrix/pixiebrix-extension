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

import automationAnywhere from "@/contrib/integrations/automation-anywhere.yaml";
import automationAnywhereOAuth2 from "@/contrib/integrations/automation-anywhere-oauth2.yaml";
import googleOAuth2Pkce from "@/contrib/integrations/google-oauth2-pkce.yaml";
import greenhouse from "@/contrib/integrations/greenhouse.yaml";
import { fromJS } from "./UserDefinedIntegration";
import { BusinessError } from "@/errors/businessErrors";
import {
  type SanitizedConfig,
  type SecretsConfig,
  type IntegrationDefinition,
} from "./integrationTypes";
import { stringToBase64 } from "uint8array-extras";
import { set } from "lodash";

describe("UserDefinedIntegration", () => {
  test("includes version", () => {
    const integration = fromJS(
      automationAnywhere as unknown as IntegrationDefinition,
    );
    expect(integration.version).toBe("1.1.0");
    expect(integration.schema.properties).toBeObject();
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

  test("handles undefined tokenUrl", () => {
    const integrationWithTokenUrl = fromJS(
      googleOAuth2Pkce as unknown as IntegrationDefinition,
    );
    const originsWithTokenUrl = integrationWithTokenUrl.getOrigins(
      {} as unknown as SanitizedConfig,
    );
    expect(originsWithTokenUrl).toEqual([
      "https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&prompt=consent",
      "https://oauth2.googleapis.com/token",
    ]);

    const configWithoutTokenUrl = set(
      googleOAuth2Pkce,
      "authentication.oauth2.tokenUrl",
      undefined,
    );

    const integrationWithoutTokenUrl = fromJS(
      configWithoutTokenUrl as unknown as IntegrationDefinition,
    );
    const originsWithoutTokenUrl = integrationWithoutTokenUrl.getOrigins(
      {} as unknown as SanitizedConfig,
    );

    expect(originsWithoutTokenUrl).toEqual([
      "https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&prompt=consent",
    ]);
  });

  test("default client ID", () => {
    const integration = fromJS(
      automationAnywhereOAuth2 as unknown as IntegrationDefinition,
    );
    const oauth2 = integration.getOAuth2Context({} as unknown as SecretsConfig);
    expect(oauth2!.client_id).toBe("g2qrB2fvyLYbotkb3zi9wwO5qjmje3eM");
  });

  test("custom client ID", () => {
    const clientId = "12345";

    const integration = fromJS(
      automationAnywhereOAuth2 as unknown as IntegrationDefinition,
    );
    const oauth2 = integration.getOAuth2Context({
      clientId,
    } as unknown as SecretsConfig);
    expect(oauth2!.client_id).toBe(clientId);
  });
});

describe("UserDefinedIntegration.authenticateBasicRequest", () => {
  it("adds authorization header", () => {
    const integration = fromJS(greenhouse as unknown as IntegrationDefinition);

    expect(integration.isBasicHttpAuth).toBeTrue();

    const config = integration.authenticateRequest(
      { apiToken: "topsecret" } as unknown as SecretsConfig,
      { url: "https://harvest.greenhouse.io/v1/candidates/", method: "get" },
    );

    expect(config.headers).toStrictEqual({
      Authorization: `Basic ${stringToBase64("topsecret:")}`,
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
