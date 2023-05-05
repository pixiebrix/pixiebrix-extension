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
import { uuidv4, validateRegistryId } from "@/types/helpers";
import serviceRegistry from "@/services/registry";
import {
  type SanitizedServiceConfiguration,
  type Service,
} from "@/types/serviceTypes";
import { INTERNAL_reset } from "@/hooks/useAsyncExternalStore";
import * as backgroundApi from "@/background/messenger/api";

// Not currently testing:
// - Listening for permissions changes
// - requestPermissions callback

jest.mocked(backgroundApi.services.locate).mockResolvedValue({
  serviceId: "google/sheet",
} as SanitizedServiceConfiguration);

const requestPermissionsMock = jest.mocked(browser.permissions.request);

jest.mock("@/services/registry", () => {
  const actual = jest.requireActual("@/services/registry");
  return {
    // Include __esModule so default export works
    __esModule: true,
    ...actual,
    default: {
      lookup: jest
        .fn()
        .mockRejectedValue(
          new Error("Mock not implemented, implement in the test case")
        ),
    },
  };
});

const serviceRegistryMock = serviceRegistry as jest.Mocked<
  typeof serviceRegistry
>;

describe("useDependency", () => {
  beforeEach(() => {
    // eslint-disable-next-line new-cap -- test helper method
    INTERNAL_reset();
  });

  it.each([null, []])("handles %s", async () => {
    const wrapper = renderHook(() => useDependency(null), {
      initialValues: { services: [] },
    });

    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual({
      config: undefined,
      hasPermissions: false,
      requestPermissions: expect.toBeFunction(),
      service: undefined,
    });
  });

  it("handles single registry id when not configured", async () => {
    const registryId = validateRegistryId("google/sheet");

    const wrapper = renderHook(() => useDependency(registryId), {
      initialValues: { services: [] },
    });

    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual({
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

    const wrapper = renderHook(() => useDependency(registryId), {
      initialValues: {
        services: [{ id: registryId, outputKey: "sheet", config: configId }],
      },
    });

    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual({
      config: { serviceId: registryId },
      // Has permissions because we mocked service to have no origins
      hasPermissions: true,
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

    const wrapper = renderHook(
      () => [useDependency(registryId), useDependency(registryId)] as const,
      {
        initialValues: {
          services: [{ id: registryId, outputKey: "sheet", config: configId }],
        },
      }
    );

    await wrapper.act(async () => {
      await wrapper.waitForEffect();
      wrapper.result.current[0].requestPermissions();
      await wrapper.waitForEffect();
    });

    expect(requestPermissionsMock).toHaveBeenCalledTimes(1);

    // Check the other one now has permissions because it was listening
    expect(wrapper.result.current[1]).toEqual({
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
