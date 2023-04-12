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

import automationAnywhere from "@contrib/services/automation-anywhere.yaml";
import automationAnywhereOAuth2 from "@contrib/services/automation-anywhere-oauth2.yaml";
import greenhouse from "@contrib/services/greenhouse.yaml";
import { fromJS } from "@/services/factory";
import { BusinessError } from "@/errors/businessErrors";
import {
  type SanitizedConfig,
  type SecretsConfig,
  type ServiceDefinition,
} from "@/types/serviceTypes";

describe("LocalDefinedService", () => {
  test("includes version", () => {
    const service = fromJS(automationAnywhere as unknown as ServiceDefinition);
    expect(service.version).toBe("1.0.0");
    expect(service.uiSchema).toMatchObject({
      "ui:order": expect.toBeArrayOfSize(5),
    });
  });

  test("get origins for oauth2 service", () => {
    const service = fromJS(
      automationAnywhereOAuth2 as unknown as ServiceDefinition
    );
    const origins = service.getOrigins({
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

    const service = fromJS(
      automationAnywhereOAuth2 as unknown as ServiceDefinition
    );
    const origins = service.getOrigins({
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
    const service = fromJS(
      automationAnywhereOAuth2 as unknown as ServiceDefinition
    );
    const origins = service.getOrigins({
      controlRoomUrl: "",
    } as unknown as SanitizedConfig);

    expect(origins).toEqual([
      // `controlRoomUrl` not included because it's not a valid URL
      "https://oauthconfigapp.automationanywhere.digital/client/oauth/authorize?hosturl=&audience=https://controlroom",
      "https://oauthconfigapp.automationanywhere.digital/client/oauth/token",
    ]);
  });

  test("default client ID", () => {
    const service = fromJS(
      automationAnywhereOAuth2 as unknown as ServiceDefinition
    );
    const oauth2 = service.getOAuth2Context({} as unknown as SecretsConfig);
    expect(oauth2.client_id).toBe("g2qrB2fvyLYbotkb3zi9wwO5qjmje3eM");
  });

  test("custom client ID", () => {
    const clientId = "12345";

    const service = fromJS(
      automationAnywhereOAuth2 as unknown as ServiceDefinition
    );
    const oauth2 = service.getOAuth2Context({
      clientId,
    } as unknown as SecretsConfig);
    expect(oauth2.client_id).toBe(clientId);
  });
});

describe("LocalDefinedService.authenticateBasicRequest", () => {
  it("adds authorization header", () => {
    const service = fromJS(greenhouse as unknown as ServiceDefinition);

    expect(service.isBasicHttpAuth).toBeTrue();

    const config = service.authenticateRequest(
      { apiToken: "topsecret" } as unknown as SecretsConfig,
      { url: "/v1/candidates/", method: "get" }
    );

    expect(config.baseURL).toEqual("https://harvest.greenhouse.io");

    expect(config.headers).toStrictEqual({
      Authorization: `Basic ${btoa("topsecret:")}`,
    });
  });

  it("requires value", () => {
    const service = fromJS(greenhouse as unknown as ServiceDefinition);

    expect(service.isBasicHttpAuth).toBeTrue();

    expect(() =>
      service.authenticateRequest(
        { notTheKey: "topsecret" } as unknown as SecretsConfig,
        { url: "/v1/candidates/", method: "get" }
      )
    ).toThrow(BusinessError);
  });
});
