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

import { waitFor } from "@testing-library/react";
import { useAuthOptions } from "./useAuthOptions";
import { appApiMock } from "@/testUtils/appApiMock";
import { API_PATHS } from "@/data/service/urlPaths";
import { renderHook } from "@/extensionConsole/testHelpers";
import { readRawConfigurations } from "@/integrations/util/readRawConfigurations";
import { RemoteIntegrationConfig } from "@/types/contract";
import {
  integrationConfigFactory,
  remoteIntegrationConfigurationFactory,
} from "@/testUtils/factories/integrationFactories";
import { meOrganizationApiResponseFactory } from "@/testUtils/factories/authFactories";
import { uuidv4 } from "@/types/helpers";

jest.mock("@/integrations/util/readRawConfigurations");

describe("useAuthOptions", () => {
  const userId = uuidv4();
  const mockRemoteConfigs: RemoteIntegrationConfig[] = [
    remoteIntegrationConfigurationFactory(),
    remoteIntegrationConfigurationFactory({
      organization: meOrganizationApiResponseFactory(),
    }),
    remoteIntegrationConfigurationFactory({ user: userId }),
  ];

  beforeEach(() => {
    jest
      .mocked(readRawConfigurations)
      .mockResolvedValue([integrationConfigFactory()]);

    appApiMock.reset();
    appApiMock
      .onGet(API_PATHS.INTEGRATIONS_SHARED)
      .reply(200, mockRemoteConfigs);
  });

  it("should return the correct auth options", async () => {
    const { result } = renderHook(() => useAuthOptions());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data).toEqual([
      {
        value: "00000001-0000-4000-A000-000000000000",
        label: "Integration 1 — Private Local",
        local: true,
        serviceId: "test/integration-1",
        sharingType: "private",
      },
      {
        value: "00000003-0000-4000-A000-000000000000",
        label: "Configuration 3 — Private",
        local: false,
        serviceId: "@test/integration-3",
        sharingType: "private",
        user: userId,
      },
      {
        value: "00000001-0000-4000-A000-000000000000",
        label: "Configuration 1 — ✨ Built-in",
        local: false,
        serviceId: "@test/integration-1",
        sharingType: "built-in",
        user: undefined,
      },
      {
        value: "00000002-0000-4000-A000-000000000000",
        label: "Configuration 2 — Test Organization 1",
        local: false,
        serviceId: "@test/integration-2",
        sharingType: "shared",
        user: undefined,
      },
    ]);
  });

  it("should handle error state", async () => {
    appApiMock.onGet(API_PATHS.INTEGRATIONS_SHARED).reply(500, "Test error");

    const { result } = renderHook(() => useAuthOptions());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect((result.current.error as Error).message).toBe(
      "Request failed with status code 500",
    );
  });
});
