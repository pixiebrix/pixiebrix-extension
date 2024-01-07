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
import useSanitizedIntegrationConfigFormikAdapter from "@/integrations/useSanitizedIntegrationConfigFormikAdapter";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import serviceRegistry from "@/integrations/registry";
import {
  type IntegrationABC,
  type SanitizedIntegrationConfig,
} from "@/integrations/integrationTypes";
import { INTERNAL_reset } from "@/hooks/useAsyncExternalStore";
import * as backgroundApi from "@/background/messenger/api";
import {
  integrationDependencyFactory,
  sanitizedIntegrationConfigFactory,
} from "@/testUtils/factories/integrationFactories";
import { validateOutputKey } from "@/runtime/runtimeTypes";

const sanitizedIntegrationConfig: SanitizedIntegrationConfig =
  sanitizedIntegrationConfigFactory({
    serviceId: validateRegistryId("google/sheet"),
  });

jest
  .mocked(backgroundApi.services.locate)
  .mockResolvedValue(sanitizedIntegrationConfig);

jest.mock("@/integrations/registry", () => {
  const actual = jest.requireActual("@/integrations/registry");
  return {
    // Include __esModule so default export works
    __esModule: true,
    ...actual,
    default: {
      lookup: jest
        .fn()
        .mockRejectedValue(
          new Error("Mock not implemented, implement in the test case"),
        ),
    },
  };
});

const serviceRegistryMock = jest.mocked(serviceRegistry);

describe("useSanitizedIntegrationConfigFormikAdapter", () => {
  beforeEach(() => {
    // eslint-disable-next-line new-cap -- test helper method
    INTERNAL_reset();
  });

  it.each([null, []])("handles %s", async () => {
    const { waitForEffect, result } = renderHook(
      () => useSanitizedIntegrationConfigFormikAdapter(null),
      {
        initialValues: { integrationDependencies: [] },
      },
    );

    await waitForEffect();

    expect(result.current.data).toBeNull();
  });

  it("handles single registry id when not configured", async () => {
    const registryId = validateRegistryId("google/sheet");

    const { waitForEffect, result } = renderHook(
      () => useSanitizedIntegrationConfigFormikAdapter(registryId),
      {
        initialValues: { integrationDependencies: [] },
      },
    );

    await waitForEffect();

    expect(result.current.data).toBeNull();
  });

  it("handles single registry id when configured", async () => {
    const registryId = validateRegistryId("google/sheet");
    const configId = uuidv4();

    serviceRegistryMock.lookup.mockResolvedValue({
      id: registryId,
      getOrigins: () => [] as any,
    } as unknown as IntegrationABC);

    const { waitForEffect, result } = renderHook(
      () => useSanitizedIntegrationConfigFormikAdapter(registryId),
      {
        initialValues: {
          integrationDependencies: [
            integrationDependencyFactory({
              integrationId: registryId,
              outputKey: validateOutputKey("sheet"),
              configId,
            }),
          ],
        },
      },
    );

    await waitForEffect();

    expect(result.current.data).toStrictEqual(sanitizedIntegrationConfig);
  });
});
