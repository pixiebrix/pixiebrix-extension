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

import {
  collectConfiguredIntegrationDependencies,
  collectModOptionsArgs,
  findMaxIntegrationDependencyApiVersion,
  selectModComponentIntegrations,
} from "@/store/modComponents/modComponentUtils";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import { integrationDependencyFactory } from "@/testUtils/factories/integrationFactories";

import {
  INTEGRATIONS_BASE_SCHEMA_URL,
  PIXIEBRIX_INTEGRATION_ID,
} from "@/integrations/constants";
import type { IntegrationDependency } from "@/integrations/integrationTypes";
import type { ModComponentBase } from "@/types/modComponentTypes";

describe("collectModOptions", () => {
  it("returns first option", () => {
    expect(collectModOptionsArgs([{ optionsArgs: { foo: 42 } }])).toStrictEqual(
      {
        foo: 42,
      },
    );
  });

  it("return blank object if not set", () => {
    expect(collectModOptionsArgs([{ optionsArgs: undefined }])).toStrictEqual(
      {},
    );
  });
});

describe("collectConfiguredIntegrationDependencies", () => {
  it("handles undefined integrationDependencies", () => {
    expect(
      collectConfiguredIntegrationDependencies([
        { integrationDependencies: undefined },
      ]),
    ).toStrictEqual([]);
  });

  it("handles duplicate integration", () => {
    const integrationId = validateRegistryId("foo/bar");
    const configId = uuidv4();
    const integrationDependency = integrationDependencyFactory({
      integrationId,
      outputKey: validateOutputKey("foo"),
      configId,
    });

    expect(
      collectConfiguredIntegrationDependencies([
        { integrationDependencies: [integrationDependency] },
        { integrationDependencies: [integrationDependency] },
      ]),
    ).toStrictEqual([integrationDependency]);
  });

  it("handles unconfigured (optional) integrations", () => {
    // Factory does not add a configId by default
    const unconfigured = integrationDependencyFactory();
    expect(
      collectConfiguredIntegrationDependencies([
        { integrationDependencies: [unconfigured] },
      ]),
    ).toBeEmpty();
  });

  it("does NOT filter out the pixiebrix integration", () => {
    const pixiebrix = integrationDependencyFactory({
      integrationId: PIXIEBRIX_INTEGRATION_ID,
    });
    expect(
      collectConfiguredIntegrationDependencies([
        { integrationDependencies: [pixiebrix] },
      ]),
    ).toStrictEqual([pixiebrix]);
  });

  it("handles multiple pixiebrix integrations and others", () => {
    const pixiebrix = integrationDependencyFactory({
      integrationId: PIXIEBRIX_INTEGRATION_ID,
    });
    const optional = integrationDependencyFactory({
      isOptional: true,
    });
    const configured = integrationDependencyFactory({
      configId: uuidv4(),
    });
    expect(
      collectConfiguredIntegrationDependencies([
        { integrationDependencies: [pixiebrix, pixiebrix] },
        { integrationDependencies: [pixiebrix, optional] },
        { integrationDependencies: [configured, pixiebrix, optional] },
        { integrationDependencies: [configured, optional] },
      ]),
    ).toStrictEqual([pixiebrix, configured]);
  });
});

describe("findMaxIntegrationDependencyApiVersion", () => {
  it("returns v1 for v1 dependencies", () => {
    const dependencies: Array<Pick<IntegrationDependency, "apiVersion">> = [
      {
        apiVersion: "v1",
      },
      {
        apiVersion: "v1",
      },
    ];
    expect(findMaxIntegrationDependencyApiVersion(dependencies)).toBe("v1");
  });

  it("returns v2 for v2 dependencies", () => {
    const dependencies: Array<Pick<IntegrationDependency, "apiVersion">> = [
      {
        apiVersion: "v2",
      },
      {
        apiVersion: "v2",
      },
      {
        apiVersion: "v2",
      },
    ];
    expect(findMaxIntegrationDependencyApiVersion(dependencies)).toBe("v2");
  });

  it("works with undefined version", () => {
    const dependencies: Array<Pick<IntegrationDependency, "apiVersion">> = [
      {},
      {},
    ];
    expect(findMaxIntegrationDependencyApiVersion(dependencies)).toBe("v1");
  });

  it("works with mixed dependencies", () => {
    const dependencies: Array<Pick<IntegrationDependency, "apiVersion">> = [
      {
        apiVersion: "v1",
      },
      {
        apiVersion: "v2",
      },
      {
        apiVersion: "v1",
      },
      {},
    ];
    expect(findMaxIntegrationDependencyApiVersion(dependencies)).toBe("v2");
  });
});

describe("selectModComponentIntegrations", () => {
  it("works for v1 integrations", () => {
    const modComponent: Pick<ModComponentBase, "integrationDependencies"> = {
      integrationDependencies: [
        integrationDependencyFactory(),
        integrationDependencyFactory({
          isOptional: undefined,
          apiVersion: undefined,
        }),
      ],
    };
    expect(selectModComponentIntegrations(modComponent)).toStrictEqual({
      [modComponent.integrationDependencies![0]!.outputKey]:
        modComponent.integrationDependencies![0]!.integrationId,
      [modComponent.integrationDependencies![1]!.outputKey]:
        modComponent.integrationDependencies![1]!.integrationId,
    });
  });

  it("works for v2 integrations", () => {
    const modComponent: Pick<ModComponentBase, "integrationDependencies"> = {
      integrationDependencies: [
        integrationDependencyFactory({
          apiVersion: "v2",
          isOptional: true,
        }),
        integrationDependencyFactory({
          apiVersion: "v2",
          isOptional: false,
        }),
        integrationDependencyFactory({
          apiVersion: "v2",
          isOptional: true,
        }),
      ],
    };
    expect(selectModComponentIntegrations(modComponent)).toStrictEqual({
      properties: {
        [modComponent.integrationDependencies![0]!.outputKey]: {
          $ref: `${INTEGRATIONS_BASE_SCHEMA_URL}${
            modComponent.integrationDependencies![0]!.integrationId
          }`,
        },
        [modComponent.integrationDependencies![1]!.outputKey]: {
          $ref: `${INTEGRATIONS_BASE_SCHEMA_URL}${
            modComponent.integrationDependencies![1]!.integrationId
          }`,
        },
        [modComponent.integrationDependencies![2]!.outputKey]: {
          $ref: `${INTEGRATIONS_BASE_SCHEMA_URL}${
            modComponent.integrationDependencies![2]!.integrationId
          }`,
        },
      },
      required: [modComponent.integrationDependencies![1]!.outputKey],
    });
  });
});
