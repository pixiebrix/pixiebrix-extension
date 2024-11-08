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

import { validateRegistryId } from "../../types/helpers";
import { modComponentDefinitionFactory } from "../../testUtils/factories/modDefinitionFactories";
import { validateOutputKey } from "../../runtime/runtimeTypes";
import getModDefinitionIntegrationIds from "./getModDefinitionIntegrationIds";

import { INTEGRATIONS_BASE_SCHEMA_URL } from "../constants";

describe("getModDefinitionIntegrationIds", () => {
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
      getModDefinitionIntegrationIds({
        extensionPoints: [
          modComponentDefinition1,
          modComponentDefinition2,
          modComponentDefinition3,
        ],
      }),
    ).toEqual([serviceId1, serviceId2]);
  });

  it("works with schema services formats", () => {
    const serviceId1 = validateRegistryId("@pixiebrix/test-service1");
    const serviceId2 = validateRegistryId("@pixiebrix/test-service2");
    const modComponentDefinition1 = modComponentDefinitionFactory({
      services: {
        properties: {
          service1: {
            $ref: `${INTEGRATIONS_BASE_SCHEMA_URL}${serviceId1}`,
          },
          service2: {
            $ref: `${INTEGRATIONS_BASE_SCHEMA_URL}${serviceId2}`,
          },
        },
        required: ["service1", "service2"],
      },
    });
    const modComponentDefinition2 = modComponentDefinitionFactory({
      services: {
        properties: {
          service1: {
            $ref: `${INTEGRATIONS_BASE_SCHEMA_URL}${serviceId1}`,
          },
        },
        required: ["service1"],
      },
    });
    expect(
      getModDefinitionIntegrationIds({
        extensionPoints: [modComponentDefinition1, modComponentDefinition2],
      }),
    ).toEqual([serviceId1, serviceId2]);
  });

  it("works with both formats together", () => {
    const serviceId1 = validateRegistryId("@pixiebrix/test-service1");
    const serviceId2 = validateRegistryId("@pixiebrix/test-service2");
    const modComponentDefinition1 = modComponentDefinitionFactory({
      services: {
        properties: {
          service1: {
            $ref: `${INTEGRATIONS_BASE_SCHEMA_URL}${serviceId1}`,
          },
          service2: {
            $ref: `${INTEGRATIONS_BASE_SCHEMA_URL}${serviceId2}`,
          },
        },
        required: ["service1", "service2"],
      },
    });
    const modComponentDefinition2 = modComponentDefinitionFactory({
      services: {
        properties: {
          service1: {
            $ref: `${INTEGRATIONS_BASE_SCHEMA_URL}${serviceId1}`,
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
      getModDefinitionIntegrationIds({
        extensionPoints: [
          modComponentDefinition1,
          modComponentDefinition2,
          modComponentDefinition3,
        ],
      }),
    ).toEqual([serviceId1, serviceId2]);
  });
});
