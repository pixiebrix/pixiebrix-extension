/*
 * Copyright (C) 2021 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { SanitizedServiceConfiguration, ServiceConfig } from "@/core";
import serviceRegistry, { PIXIEBRIX_SERVICE_ID } from "@/services/registry";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { isBackgroundPage } from "webext-detect-page";

const axiosMock = new MockAdapter(axios);
const mockIsBackgroundPage = isBackgroundPage as jest.MockedFunction<
  typeof isBackgroundPage
>;
mockIsBackgroundPage.mockImplementation(() => false);

jest.mock("@/background/protocol");
jest.mock("@/auth/token");
jest.mock("webext-detect-page");

import * as token from "@/auth/token";
import { AxiosRequestConfig } from "axios";

import { proxyService } from "./requests";

afterEach(() => {
  axiosMock.reset();
  axiosMock.resetHistory();
});

(token.getExtensionToken as any).mockResolvedValue("abc123");

serviceRegistry.register({
  id: PIXIEBRIX_SERVICE_ID,
  authenticateRequest: (
    serviceConfig: ServiceConfig,
    requestConfig: AxiosRequestConfig
  ) => requestConfig,
} as any);

const requestConfig: AxiosRequestConfig = {
  url: "http://www.example.com",
  method: "get",
};

const proxyServiceConfig = {
  id: "123",
  proxy: true,
  serviceId: "example/api",
  config: {},
} as SanitizedServiceConfiguration;

it("can make an unauthenticated request", async () => {
  axiosMock.onAny().reply(200, {});
  const { status } = await proxyService(null, requestConfig);
  expect(status).toEqual(200);
});

it("can handle unauthenticated request error", async () => {
  axiosMock.onAny().reply(500);

  try {
    await proxyService(null, requestConfig);
    fail("Expected proxyService to throw an error");
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    const { status } = error.response;
    expect(status).toEqual(500);
  }
});

it("can proxy request", async () => {
  axiosMock.onAny().reply(200, {
    json: { foo: 42 },
    status_code: 200,
  });
  const { status, data } = await proxyService(
    proxyServiceConfig,
    requestConfig
  );
  expect(JSON.parse(axiosMock.history.post[0].data)).toEqual({
    ...requestConfig,
    service_id: "example/api",
    auth_id: "123",
  });
  expect(status).toEqual(200);
  expect(data).toEqual({ foo: 42 });
});

it("can proxy remote error", async () => {
  axiosMock.onAny().reply(200, {
    json: {},
    reason: "Bad request",
    status_code: 400,
  });

  try {
    await proxyService(proxyServiceConfig, requestConfig);
    fail("Expected proxyService to throw an error");
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    const { status, statusText } = error.cause.response;
    expect(status).toEqual(400);
    expect(statusText).toEqual("Bad request");
  }
});

it("handle proxy error", async () => {
  axiosMock.onAny().reply(500);

  try {
    await proxyService(proxyServiceConfig, requestConfig);
    fail("Expected proxyService to throw an error");
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toEqual(
      "An error occurred when proxying the service request"
    );
  }
});
