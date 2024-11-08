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

import contentScriptPlatform from "./contentScriptPlatform";
import { setPlatform } from "../platform/platformContext";
import { sanitizedIntegrationConfigFactory } from "../testUtils/factories/integrationFactories";
import { TEST_deleteFeatureFlagsCache } from "@/auth/featureFlagStorage";
import { appApiMock } from "../testUtils/appApiMock";
import { InteractiveLoginRequiredError } from "@/errors/authErrors";
import { waitForEffect } from "../testUtils/testHelpers";
import { deferLogin } from "./integrations/deferredLoginController";
import pDefer from "p-defer";
import {
  clearModComponentDebugLogs,
  performConfiguredRequestInBackground,
  traces,
} from "@/background/messenger/api";
import { API_PATHS } from "@/data/service/urlPaths";
import { modComponentFactory } from "../testUtils/factories/modComponentFactories";

jest.mock("./integrations/deferredLoginController");

jest.mock("../background/messenger/api", () => ({
  performConfiguredRequestInBackground: jest.fn().mockResolvedValue({}),
  clearModComponentDebugLogs: jest.fn(),
  traces: {
    clear: jest.fn(),
  },
}));

const deferLoginMock = jest.mocked(deferLogin);
const backgroundRequestMock = jest.mocked(performConfiguredRequestInBackground);
const clearModComponentDebugLogsMock = jest.mocked(clearModComponentDebugLogs);
const tracesClearMock = jest.mocked(traces.clear);

describe("contentScriptPlatform", () => {
  beforeEach(() => {
    setPlatform(contentScriptPlatform);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await TEST_deleteFeatureFlagsCache();
  });

  it("makes non-interactive successful call", async () => {
    appApiMock.onGet(API_PATHS.FEATURE_FLAGS).reply(200, { flags: [] });

    const config = sanitizedIntegrationConfigFactory();
    const request = { url: "https://example.com" };
    await contentScriptPlatform.request(config, request);

    expect(backgroundRequestMock).toHaveBeenCalledExactlyOnceWith(
      config,
      request,
      {
        interactiveLogin: false,
      },
    );
  });

  it("handles interactive error", async () => {
    appApiMock.onGet(API_PATHS.FEATURE_FLAGS).reply(200, { flags: [] });

    backgroundRequestMock.mockRejectedValueOnce(new Error("Other Error"));

    const config = sanitizedIntegrationConfigFactory();
    const request = { url: "https://example.com" };
    await expect(
      contentScriptPlatform.request(config, request),
    ).rejects.toThrow();

    expect(backgroundRequestMock).toHaveBeenCalledExactlyOnceWith(
      config,
      request,
      {
        interactiveLogin: false,
      },
    );
  });

  it("handles deferred login", async () => {
    appApiMock.onGet(API_PATHS.FEATURE_FLAGS).reply(200, { flags: [] });

    backgroundRequestMock.mockRejectedValueOnce(
      new InteractiveLoginRequiredError("Test error message"),
    );

    const deferredPromise = pDefer<void>();

    deferLoginMock.mockResolvedValue(deferredPromise.promise);

    const config = sanitizedIntegrationConfigFactory();
    const request = { url: "https://example.com" };

    const requestPromise = contentScriptPlatform.request(config, request);

    await waitForEffect();

    expect(backgroundRequestMock).toHaveBeenCalledExactlyOnceWith(
      config,
      request,
      {
        interactiveLogin: false,
      },
    );
    expect(deferLoginMock).toHaveBeenCalledOnce();

    backgroundRequestMock.mockResolvedValue({
      data: {},
      status: 200,
      statusText: "OK",
    });
    deferredPromise.resolve();

    await expect(requestPromise).resolves.toBeObject();
  });

  describe("debugger", () => {
    it("clears traces and clears logs when logValues is true", async () => {
      const componentId = modComponentFactory().id;
      await contentScriptPlatform.debugger.clear(componentId, {
        logValues: true,
      });

      expect(tracesClearMock).toHaveBeenCalledExactlyOnceWith(componentId);
      expect(clearModComponentDebugLogsMock).toHaveBeenCalledExactlyOnceWith(
        componentId,
      );
    });

    it("clears traces and skips clearing logs when logValues is false", async () => {
      const componentId = modComponentFactory().id;
      await contentScriptPlatform.debugger.clear(componentId, {
        logValues: false,
      });

      expect(tracesClearMock).toHaveBeenCalledExactlyOnceWith(componentId);
      expect(clearModComponentDebugLogsMock).not.toHaveBeenCalled();
    });
  });
});
