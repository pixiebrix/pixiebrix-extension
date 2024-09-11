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
import { useAuthOptions } from "./auth";
import * as readRawConfigurationsModule from "@/integrations/util/readRawConfigurations";
import { useGetIntegrationAuthsQuery } from "@/data/service/api";
import { renderHook } from "@testing-library/react-hooks";
import { type IntegrationConfig } from "@/integrations/integrationTypes";
import { type UUID } from "@/types/stringTypes";
import { type RegistryId } from "@/types/registryTypes";

jest.mock("@/integrations/util/readRawConfigurations");
jest.mock("@/data/service/api");

describe("useAuthOptions", () => {
  const mockLocalConfigs: IntegrationConfig[] = [
    {
      _rawIntegrationConfigBrand: null,
      id: "local1" as UUID,
      label: "Local Config 1",
      integrationId: "service1" as RegistryId,
      config: { _integrationConfigBrand: null },
    },
    {
      _rawIntegrationConfigBrand: null,
      id: "local2" as UUID,
      label: "Local Config 2",
      integrationId: "service2" as RegistryId,
      config: { _integrationConfigBrand: null },
    },
  ];

  const mockRemoteConfigs = [
    {
      id: "remote1",
      label: "Remote Config 1",
      service: { config: { metadata: { id: "service1" } } },
      user: "user1",
    },
    {
      id: "remote2",
      label: "Remote Config 2",
      service: { config: { metadata: { id: "service2" } } },
      organization: { name: "Org 1" },
    },
    {
      id: "remote3",
      label: "",
      service: { config: { metadata: { id: "service3" } } },
    },
  ];

  beforeEach(() => {
    jest.resetAllMocks();
    jest
      .mocked(readRawConfigurationsModule.readRawConfigurations)
      .mockResolvedValue(mockLocalConfigs);
    jest.mocked(useGetIntegrationAuthsQuery).mockReturnValue({
      data: mockRemoteConfigs,
      currentData: mockRemoteConfigs,
      isLoading: false,
      isError: false,
      isSuccess: true,
      isUninitialized: false,
      isFetching: false,
      refetch: jest.fn(),
    });
  });

  it("should return the correct auth options", async () => {
    const { result } = renderHook(() => useAuthOptions());

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data).toEqual([
      {
        value: "local1",
        label: "Local Config 1 — Private Local",
        local: true,
        serviceId: "service1",
        sharingType: "private",
      },
      {
        value: "local2",
        label: "Local Config 2 — Private Local",
        local: true,
        serviceId: "service2",
        sharingType: "private",
      },
      {
        value: "remote1",
        label: "Remote Config 1 — Private",
        local: false,
        user: "user1",
        serviceId: "service1",
        sharingType: "private",
      },
      {
        value: "remote3",
        label: "Default — ✨ Built-in",
        local: false,
        user: undefined,
        serviceId: "service3",
        sharingType: "built-in",
      },
      {
        value: "remote2",
        label: "Remote Config 2 — Org 1",
        local: false,
        user: undefined,
        serviceId: "service2",
        sharingType: "shared",
      },
    ]);
  });

  it("should handle loading state", () => {
    jest.mocked(useGetIntegrationAuthsQuery).mockReturnValue({
      isLoading: true,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useAuthOptions());

    expect(result.current.isLoading).toBe(true);
  });

  it("should handle error state", () => {
    jest.mocked(useGetIntegrationAuthsQuery).mockReturnValue({
      isError: true,
      error: new Error("Test error"),
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useAuthOptions());

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toEqual(new Error("Test error"));
  });
});
