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

import { renderHook } from "@/pageEditor/testHelpers";
import useSanitizedIntegrationConfigFormikAdapter from "@/integrations/useSanitizedIntegrationConfigFormikAdapter";
import { validateRegistryId } from "@/types/helpers";
import {
  type IntegrationDependency,
  type SanitizedIntegrationConfig,
} from "@/integrations/integrationTypes";
import { INTERNAL_reset } from "@/hooks/useAsyncExternalStore";
import * as backgroundApi from "@/background/messenger/api";
import {
  integrationDependencyFactory,
  sanitizedIntegrationConfigFactory,
} from "@/testUtils/factories/integrationFactories";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import { makeVariableExpression } from "@/utils/variableUtils";
import { type Expression, type OutputKey } from "@/types/runtimeTypes";
import { type RegistryId } from "@/types/registryTypes";
import { waitFor } from "@testing-library/react";

const integrationId1 = validateRegistryId("test/test-integration-1");
const integrationId2 = validateRegistryId("test/test-integration-2");
const outputKey1 = validateOutputKey("third_party_service1");
const outputKey1a = validateOutputKey("third_party_service1a");
const outputKey2 = validateOutputKey("third_party_service2");

const integrationConfig1 = sanitizedIntegrationConfigFactory({
  serviceId: integrationId1,
});
const integrationConfig1a = sanitizedIntegrationConfigFactory({
  serviceId: integrationId1,
});
const integrationConfig2 = sanitizedIntegrationConfigFactory({
  serviceId: integrationId2,
});

const integrationDependency1 = integrationDependencyFactory({
  integrationId: integrationId1,
  outputKey: outputKey1,
  configId: integrationConfig1.id,
});
const integrationDependency1a = integrationDependencyFactory({
  integrationId: integrationId1,
  outputKey: outputKey1a,
  configId: integrationConfig1a.id,
});
const integrationDependency2 = integrationDependencyFactory({
  integrationId: integrationId2,
  outputKey: outputKey2,
  configId: integrationConfig2.id,
});

jest
  .mocked(backgroundApi.integrationConfigLocator.findSanitizedIntegrationConfig)
  .mockImplementation(async (integrationId, configId) => {
    if (integrationId === integrationId2) {
      return integrationConfig2;
    }

    if (configId === integrationConfig1.id) {
      return integrationConfig1;
    }

    if (configId === integrationConfig1a.id) {
      return integrationConfig1a;
    }

    throw new Error(`Unknown authId: ${configId}`);
  });

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

const INTEGRATION_FIELD_NAME = "integration";

describe("useSanitizedIntegrationConfigFormikAdapter", () => {
  beforeEach(() => {
    INTERNAL_reset();
  });

  test.each`
    integrationIds                      | integrationDependencies                              | configuredOutputKey | expectedConfig
    ${[]}                               | ${[]}                                                | ${null}             | ${null}
    ${[integrationId1]}                 | ${[]}                                                | ${null}             | ${null}
    ${[integrationId1]}                 | ${[integrationDependency1]}                          | ${null}             | ${null}
    ${[integrationId1]}                 | ${[integrationDependency1, integrationDependency2]}  | ${null}             | ${null}
    ${[integrationId1, integrationId2]} | ${[integrationDependency1, integrationDependency2]}  | ${null}             | ${null}
    ${[integrationId1]}                 | ${[integrationDependency1, integrationDependency1a]} | ${null}             | ${null}
    ${[integrationId1]}                 | ${[integrationDependency1]}                          | ${outputKey1}       | ${integrationConfig1}
    ${[integrationId1, integrationId2]} | ${[integrationDependency1]}                          | ${outputKey1}       | ${integrationConfig1}
    ${[integrationId1]}                 | ${[integrationDependency1, integrationDependency2]}  | ${outputKey1}       | ${integrationConfig1}
    ${[integrationId1, integrationId2]} | ${[integrationDependency1, integrationDependency2]}  | ${outputKey1}       | ${integrationConfig1}
    ${[integrationId1]}                 | ${[integrationDependency1, integrationDependency1a]} | ${outputKey1}       | ${integrationConfig1}
    ${[integrationId2]}                 | ${[integrationDependency1, integrationDependency2]}  | ${outputKey2}       | ${integrationConfig2}
    ${[integrationId1, integrationId2]} | ${[integrationDependency1, integrationDependency2]}  | ${outputKey2}       | ${integrationConfig2}
    ${[integrationId1]}                 | ${[integrationDependency1, integrationDependency1a]} | ${outputKey1a}      | ${integrationConfig1a}
  `(
    "given $integrationDependencies.length configured dependencies and configured output key: $configuredOutputKey, when called with integrationIds: $integrationIds, then returns the correct config",
    async ({
      integrationIds,
      integrationDependencies,
      configuredOutputKey,
      expectedConfig,
    }: {
      integrationIds: RegistryId[];
      integrationDependencies: IntegrationDependency[];
      configuredOutputKey: OutputKey | null;
      expectedConfig: SanitizedIntegrationConfig | null;
    }) => {
      const initialValues: {
        integrationDependencies: IntegrationDependency[];
        [INTEGRATION_FIELD_NAME]?: Expression<string, "var">;
      } = {
        integrationDependencies,
      };
      if (configuredOutputKey) {
        initialValues[INTEGRATION_FIELD_NAME] =
          makeVariableExpression(configuredOutputKey);
      }

      const { result } = renderHook(
        () =>
          useSanitizedIntegrationConfigFormikAdapter(
            integrationIds,
            INTEGRATION_FIELD_NAME,
          ),
        { initialValues },
      );

      await waitFor(() => {
        if (expectedConfig == null) {
          expect(result.current.data).toBeNull();
        } else {
          expect(result.current.data).toStrictEqual(expectedConfig);
        }
      });
    },
  );
});
