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

import { getUnconfiguredComponentIntegrations } from "@/integrations/util/getUnconfiguredComponentIntegrations";
import { validateRegistryId } from "@/types/helpers";
import { modComponentDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import { SERVICES_BASE_SCHEMA_URL } from "@/integrations/util/makeServiceContextFromDependencies";
import { validateOutputKey } from "@/runtime/runtimeTypes";

describe("getUnconfiguredComponentIntegrations", () => {
  it("returns empty if no integrations", () => {
    expect(
      getUnconfiguredComponentIntegrations({ extensionPoints: [] })
    ).toStrictEqual([]);
  });

  it("returns an array of integrationDependencies regardless of format", () => {
    const serviceId1 = validateRegistryId("@pixiebrix/test-service1");
    const serviceId2 = validateRegistryId("@pixiebrix/test-service2");
    const serviceId3 = validateRegistryId("@pixiebrix/test-service3");
    const modComponentDefinition1 = modComponentDefinitionFactory({
      services: {
        properties: {
          service1: {
            $ref: `${SERVICES_BASE_SCHEMA_URL}${serviceId1}`,
          },
          service2: {
            $ref: `${SERVICES_BASE_SCHEMA_URL}${serviceId2}`,
          },
        },
        required: ["service1", "service2"],
      },
    });

    const modComponentDefinition2 = modComponentDefinitionFactory({
      services: {
        [validateOutputKey("service3")]: serviceId3,
      },
    });

    expect(
      getUnconfiguredComponentIntegrations({
        extensionPoints: [modComponentDefinition1, modComponentDefinition2],
      })
    ).toEqual([
      {
        integrationId: serviceId1,
        outputKey: validateOutputKey("service1"),
        isOptional: false,
        apiVersion: "v2",
      },
      {
        integrationId: serviceId2,
        outputKey: validateOutputKey("service2"),
        isOptional: false,
        apiVersion: "v2",
      },
      {
        integrationId: serviceId3,
        outputKey: validateOutputKey("service3"),
        isOptional: false,
        apiVersion: "v1",
      },
    ]);
  });

  it("dedupes integrations", () => {
    const serviceId1 = validateRegistryId("@pixiebrix/test-service1");
    const serviceId2 = validateRegistryId("@pixiebrix/test-service2");
    const modComponentDefinition1 = modComponentDefinitionFactory({
      services: {
        properties: {
          service1: {
            $ref: `${SERVICES_BASE_SCHEMA_URL}${serviceId1}`,
          },
          service2: {
            $ref: `${SERVICES_BASE_SCHEMA_URL}${serviceId2}`,
          },
        },
        required: ["service1", "service2"],
      },
    });

    const modComponentDefinition2 = modComponentDefinitionFactory({
      services: {
        properties: {
          service1: {
            $ref: `${SERVICES_BASE_SCHEMA_URL}${serviceId1}`,
          },
        },
        required: ["service1"],
      },
    });

    expect(
      getUnconfiguredComponentIntegrations({
        extensionPoints: [modComponentDefinition1, modComponentDefinition2],
      })
    ).toEqual(
      expect.arrayContaining([
        {
          integrationId: serviceId1,
          outputKey: validateOutputKey("service1"),
          isOptional: false,
          apiVersion: "v2",
        },
        {
          integrationId: serviceId2,
          outputKey: validateOutputKey("service2"),
          isOptional: false,
          apiVersion: "v2",
        },
      ])
    );
  });

  it("deduping works with both formats together, preferring required integrations", () => {
    const serviceId1 = validateRegistryId("@pixiebrix/test-service1");
    const serviceId2 = validateRegistryId("@pixiebrix/test-service2");

    const modComponentDefinition1 = modComponentDefinitionFactory({
      services: {
        properties: {
          service1: {
            $ref: `${SERVICES_BASE_SCHEMA_URL}${serviceId1}`,
          },
          service2: {
            $ref: `${SERVICES_BASE_SCHEMA_URL}${serviceId2}`,
          },
        },
        required: [],
      },
    });

    const modComponentDefinition2 = modComponentDefinitionFactory({
      services: {
        [validateOutputKey("service1")]: serviceId1,
      },
    });

    expect(
      getUnconfiguredComponentIntegrations({
        extensionPoints: [modComponentDefinition1, modComponentDefinition2],
      })
    ).toEqual(
      expect.arrayContaining([
        {
          integrationId: serviceId1,
          outputKey: validateOutputKey("service1"),
          isOptional: false,
          apiVersion: "v1",
        },
        {
          integrationId: serviceId2,
          outputKey: validateOutputKey("service2"),
          isOptional: true,
          apiVersion: "v2",
        },
      ])
    );
  });
});
