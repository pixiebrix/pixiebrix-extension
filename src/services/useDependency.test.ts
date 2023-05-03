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

import { renderHook } from "@/pageEditor/testHelpers";
import useDependency from "@/services/useDependency";
import { waitForEffect } from "@/testUtils/testHelpers";
import { act } from "@testing-library/react-hooks";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import serviceRegistry from "@/services/registry";
import { type Service } from "@/types/serviceTypes";
import { ensureAllPermissionsFromUserGesture } from "@/permissions/permissionsUtils";

// Not currently test:
// - Listening for permissions changes
// - requestPermissions callback

jest.mock("@/utils/permissions", () => ({
  requestPermissions: jest.fn().mockResolvedValue(true),
}));

jest.mock("@/background/messenger/api", () => ({
  __esModule: true,
  containsPermissions: jest.fn().mockResolvedValue(false),
  services: {
    locate: jest.fn().mockResolvedValue({
      serviceId: "google/sheet",
    }),
  },
}));

jest.mock("@/services/registry", () => {
  const actual = jest.requireActual("@/services/registry");
  return {
    // Include __esModule so default export works
    __esModule: true,
    ...actual,
    default: {
      lookup: jest.fn().mockRejectedValue(new Error("Mock not implemented")),
    },
  };
});

const serviceRegistryMock = serviceRegistry as jest.Mocked<
  typeof serviceRegistry
>;

const requestPermissionsMock =
  ensureAllPermissionsFromUserGesture as jest.MockedFunction<
    typeof ensureAllPermissionsFromUserGesture
  >;

describe("useDependency", () => {
  it.each([null, []])("handles %s", async () => {
    const hookish = renderHook(() => useDependency(null), {
      initialValues: { services: [] },
    });

    await act(async () => {
      await waitForEffect();
    });

    expect(hookish.result.current).toBeNull();
  });

  it("handles single registry id when not configured", async () => {
    const registryId = validateRegistryId("google/sheet");

    const hookish = renderHook(() => useDependency(registryId), {
      initialValues: { services: [] },
    });

    await act(async () => {
      await waitForEffect();
    });

    expect(hookish.result.current).toEqual({
      config: undefined,
      hasPermissions: false,
      requestPermissions: expect.toBeFunction(),
      service: undefined,
    });
  });

  it("handles single registry id when configured", async () => {
    const registryId = validateRegistryId("google/sheet");
    const configId = uuidv4();

    serviceRegistryMock.lookup.mockResolvedValue({
      id: registryId,
      getOrigins: () => [] as any,
    } as unknown as Service);

    const hookish = renderHook(() => useDependency(registryId), {
      initialValues: {
        services: [{ id: registryId, outputKey: "sheet", config: configId }],
      },
    });

    await act(async () => {
      await waitForEffect();
    });

    expect(hookish.result.current).toEqual({
      config: { serviceId: registryId },
      hasPermissions: false,
      requestPermissions: expect.toBeFunction(),
      service: {
        getOrigins: expect.toBeFunction(),
        id: registryId,
      },
    });
  });

  it("handles multiple hooks on page", async () => {
    const registryId = validateRegistryId("google/sheet");
    const configId = uuidv4();

    serviceRegistryMock.lookup.mockResolvedValue({
      id: registryId,
      getOrigins: () => [] as any,
    } as unknown as Service);

    const hookish = renderHook(
      () => [useDependency(registryId), useDependency(registryId)] as const,
      {
        initialValues: {
          services: [{ id: registryId, outputKey: "sheet", config: configId }],
        },
      }
    );

    await act(async () => {
      await waitForEffect();
      hookish.result.current[0].requestPermissions();
      await waitForEffect();
    });

    expect(requestPermissionsMock).toHaveBeenCalledTimes(1);

    // Check the other one now has permissions because it was listening
    expect(hookish.result.current[1]).toEqual({
      config: { serviceId: registryId },
      hasPermissions: true,
      requestPermissions: expect.toBeFunction(),
      service: {
        getOrigins: expect.toBeFunction(),
        id: registryId,
      },
    });
  });
});
