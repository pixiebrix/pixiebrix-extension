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

import React from "react";
import {
  deferLogin,
  showBannerFromConfig,
  clearDeferredLogins,
  dismissDeferredLogin,
} from "@/contentScript/integrations/deferredLoginController";
import { sanitizedIntegrationConfigFactory } from "@/testUtils/factories/integrationFactories";
import { RequestSupersededError } from "@/errors/businessErrors";
import { showLoginBanner } from "@/contentScript/messenger/api";
import type { Target } from "@/types/messengerTypes";
import type { SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import integrationRegistry from "@/integrations/registry";
import { waitForEffect } from "@/testUtils/testHelpers";

// I couldn't get shadow-dom-testing-library working
jest.mock("react-shadow/emotion", () => ({
  __esModule: true,
  default: {
    div(props: any) {
      return <div {...props}></div>;
    },
  },
}));

jest.mock("@/contentScript/messenger/api", () => ({
  showLoginBanner: jest.fn(),
}));

integrationRegistry.lookup = jest.fn();

beforeEach(() => {
  clearDeferredLogins();
});

describe("deferredLoginController", () => {
  it("shows banner", async () => {
    jest
      .mocked(showLoginBanner)
      .mockImplementation(
        async (_target: Target, config: SanitizedIntegrationConfig) =>
          showBannerFromConfig(config),
      );
    jest
      .mocked(integrationRegistry.lookup)
      .mockResolvedValue({ name: "Integration Name" } as any);

    const config = sanitizedIntegrationConfigFactory({ label: "Test Config" });

    const promise = deferLogin(config);

    await waitForEffect();

    expect(document.querySelector(".login-button")).toHaveAccessibleName(
      "Log in to Test Config",
    );
    clearDeferredLogins();
    // Throws due to test cleanup
    await expect(promise).rejects.toThrow();
  });

  it("cancels original request", async () => {
    jest
      .mocked(showLoginBanner)
      .mockImplementation(
        async (_target: Target, config: SanitizedIntegrationConfig) =>
          showBannerFromConfig(config),
      );
    jest
      .mocked(integrationRegistry.lookup)
      .mockResolvedValue({ name: "Integration Name" } as any);

    const config = sanitizedIntegrationConfigFactory({ label: "Test Config" });

    const originalPromise = deferLogin(config);
    const nextPromise = deferLogin(config);

    await expect(originalPromise).rejects.toThrow(RequestSupersededError);

    clearDeferredLogins();
    // Throws due to test cleanup
    await expect(nextPromise).rejects.toThrow();
  });

  it("dismissDeferredLogin cancels the deferredLogin and removes the banner", async () => {
    jest
      .mocked(showLoginBanner)
      .mockImplementation(
        async (_target: Target, config: SanitizedIntegrationConfig) =>
          showBannerFromConfig(config),
      );
    jest
      .mocked(integrationRegistry.lookup)
      .mockResolvedValue({ name: "Integration Name" } as any);

    const config = sanitizedIntegrationConfigFactory({ label: "Test Config" });

    const promise = deferLogin(config);

    dismissDeferredLogin(config.id);

    await expect(promise).rejects.toThrow("User dismissed login");
  });
});
