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

import contentScriptPlatform from "@/contentScript/contentScriptPlatform";
import { setPlatform } from "@/platform/platformContext";
import { sanitizedIntegrationConfigFactory } from "@/testUtils/factories/integrationFactories";
import { TEST_deleteFeatureFlagsCache } from "@/auth/featureFlagStorage";
import { appApiMock } from "@/testUtils/appApiMock";
import { InteractiveLoginRequiredError } from "@/errors/authErrors";
import { waitForEffect } from "@/testUtils/testHelpers";
import { deferLogin } from "@/contentScript/integrations/deferredLoginController";
import pDefer from "p-defer";
import { performConfiguredRequestInBackground } from "@/background/messenger/api";

jest.mock("@/contentScript/integrations/deferredLoginController");

jest.mock("@/background/messenger/api", () => ({
  performConfiguredRequestInBackground: jest.fn().mockResolvedValue({}),
}));

const deferLoginMock = jest.mocked(deferLogin);

const backgroundRequestMock = jest.mocked(performConfiguredRequestInBackground);

beforeEach(() => {
  setPlatform(contentScriptPlatform);
});

afterEach(async () => {
  jest.clearAllMocks();
  await TEST_deleteFeatureFlagsCache();
});

describe("contentScriptPlatform", () => {
  it("makes non-interactive successful call", async () => {
    appApiMock.onGet("/api/me/").reply(200, { flags: [] });

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
    appApiMock.onGet("/api/me/").reply(200, { flags: [] });

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
    appApiMock.onGet("/api/me/").reply(200, { flags: [] });

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
});
