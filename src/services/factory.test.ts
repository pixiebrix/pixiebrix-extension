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

import automationAnywhere from "@contrib/services/automation-anywhere.yaml";
import automationAnywhereOAuth2 from "@contrib/services/automation-anywhere-oauth2.yaml";
import greenhouse from "@contrib/services/greenhouse.yaml";
import { fromJS } from "@/services/factory";
import { type ServiceDefinition } from "@/types/definitions";
import { type SanitizedConfig, ServiceConfig } from "@/core";
import { BusinessError } from "@/errors/businessErrors";

describe("LocalDefinedService", () => {
  test("includes version", () => {
    const service = fromJS(automationAnywhere as unknown as ServiceDefinition);
    expect(service.version).toBe("1.0.0");
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
});

describe("LocalDefinedService.authenticateBasicRequest", () => {
  it("adds authorization header", () => {
    const service = fromJS(greenhouse as unknown as ServiceDefinition);

    expect(service.isBasic).toBeTrue();

    const config = service.authenticateRequest(
      { apiToken: "topsecret" } as unknown as ServiceConfig,
      { url: "/v1/candidates/", method: "get" }
    );

    expect(config.baseURL).toEqual("https://harvest.greenhouse.io");

    expect(config.headers).toStrictEqual({
      Authorization: `Basic ${btoa("topsecret:")}`,
    });
  });

  it("requires value", () => {
    const service = fromJS(greenhouse as unknown as ServiceDefinition);

    expect(service.isBasic).toBeTrue();

    expect(() =>
      service.authenticateRequest(
        { notTheKey: "topsecret" } as unknown as ServiceConfig,
        { url: "/v1/candidates/", method: "get" }
      )
    ).toThrow(BusinessError);
  });
});
