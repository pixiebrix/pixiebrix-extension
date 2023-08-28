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

import {
  getIntegrationIds,
  getUnconfiguredComponentIntegrations,
} from "./modDefinitionUtils";
import { modComponentDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import extensionPointRegistry from "@/starterBricks/registry";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import { validateRegistryId } from "@/types/helpers";
import { SERVICE_BASE_SCHEMA } from "@/services/serviceUtils";

extensionPointRegistry.lookup = jest.fn();

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
            $ref: `${SERVICE_BASE_SCHEMA}${serviceId1}`,
          },
          service2: {
            $ref: `${SERVICE_BASE_SCHEMA}${serviceId2}`,
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
        id: serviceId1,
        outputKey: validateOutputKey("service1"),
        isOptional: false,
        apiVersion: "v2",
      },
      {
        id: serviceId2,
        outputKey: validateOutputKey("service2"),
        isOptional: false,
        apiVersion: "v2",
      },
      {
        id: serviceId3,
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
            $ref: `${SERVICE_BASE_SCHEMA}${serviceId1}`,
          },
          service2: {
            $ref: `${SERVICE_BASE_SCHEMA}${serviceId2}`,
          },
        },
        required: ["service1", "service2"],
      },
    });

    const modComponentDefinition2 = modComponentDefinitionFactory({
      services: {
        properties: {
          service1: {
            $ref: `${SERVICE_BASE_SCHEMA}${serviceId1}`,
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
          id: serviceId1,
          outputKey: validateOutputKey("service1"),
          isOptional: false,
          apiVersion: "v2",
        },
        {
          id: serviceId2,
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
            $ref: `${SERVICE_BASE_SCHEMA}${serviceId1}`,
          },
          service2: {
            $ref: `${SERVICE_BASE_SCHEMA}${serviceId2}`,
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
          id: serviceId1,
          outputKey: validateOutputKey("service1"),
          isOptional: false,
          apiVersion: "v1",
        },
        {
          id: serviceId2,
          outputKey: validateOutputKey("service2"),
          isOptional: true,
          apiVersion: "v2",
        },
      ])
    );
  });
});

describe("getIntegrationIds", () => {
  it("works with record services formats", () => {
    const serviceId1 = validateRegistryId("@pixiebrix/test-service1");
    const serviceId2 = validateRegistryId("@pixiebrix/test-service2");
    const modComponentDefinition1 = modComponentDefinitionFactory();
    const modComponentDefinition2 = modComponentDefinitionFactory({
      services: {
        [validateOutputKey("service1")]: serviceId1,
        [validateOutputKey("service2")]: serviceId2,
      },
    });
    const modComponentDefinition3 = modComponentDefinitionFactory({
      services: {
        [validateOutputKey("service1")]: serviceId1,
      },
    });
    expect(
      getIntegrationIds({
        extensionPoints: [
          modComponentDefinition1,
          modComponentDefinition2,
          modComponentDefinition3,
        ],
      })
    ).toEqual([serviceId1, serviceId2]);
  });

  it("works with schema services formats", () => {
    const serviceId1 = validateRegistryId("@pixiebrix/test-service1");
    const serviceId2 = validateRegistryId("@pixiebrix/test-service2");
    const modComponentDefinition1 = modComponentDefinitionFactory({
      services: {
        properties: {
          service1: {
            $ref: `${SERVICE_BASE_SCHEMA}${serviceId1}`,
          },
          service2: {
            $ref: `${SERVICE_BASE_SCHEMA}${serviceId2}`,
          },
        },
        required: ["service1", "service2"],
      },
    });
    const modComponentDefinition2 = modComponentDefinitionFactory({
      services: {
        properties: {
          service1: {
            $ref: `${SERVICE_BASE_SCHEMA}${serviceId1}`,
          },
        },
        required: ["service1"],
      },
    });
    expect(
      getIntegrationIds({
        extensionPoints: [modComponentDefinition1, modComponentDefinition2],
      })
    ).toEqual([serviceId1, serviceId2]);
  });

  it("works with both formats together", () => {
    const serviceId1 = validateRegistryId("@pixiebrix/test-service1");
    const serviceId2 = validateRegistryId("@pixiebrix/test-service2");
    const modComponentDefinition1 = modComponentDefinitionFactory({
      services: {
        properties: {
          service1: {
            $ref: `${SERVICE_BASE_SCHEMA}${serviceId1}`,
          },
          service2: {
            $ref: `${SERVICE_BASE_SCHEMA}${serviceId2}`,
          },
        },
        required: ["service1", "service2"],
      },
    });
    const modComponentDefinition2 = modComponentDefinitionFactory({
      services: {
        properties: {
          service1: {
            $ref: `${SERVICE_BASE_SCHEMA}${serviceId1}`,
          },
        },
        required: ["service1"],
      },
    });
    const modComponentDefinition3 = modComponentDefinitionFactory({
      services: {
        [validateOutputKey("service1")]: serviceId1,
        [validateOutputKey("service2")]: serviceId2,
      },
    });
    expect(
      getIntegrationIds({
        extensionPoints: [
          modComponentDefinition1,
          modComponentDefinition2,
          modComponentDefinition3,
        ],
      })
    ).toEqual([serviceId1, serviceId2]);
  });
});
