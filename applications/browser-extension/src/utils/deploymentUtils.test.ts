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
  checkExtensionUpdateRequired,
  findLocalDeploymentConfiguredIntegrationDependencies,
  isDeploymentActive,
  makeUpdatedFilter,
  mergeDeploymentIntegrationDependencies,
  selectActivatedDeployments,
} from "./deploymentUtils";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { type SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import {
  activatedModComponentFactory,
  modComponentFactory,
} from "@/testUtils/factories/modComponentFactories";
import { modComponentDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import { sanitizedIntegrationConfigFactory } from "@/testUtils/factories/integrationFactories";
import {
  deploymentFactory,
  activatableDeploymentFactory,
} from "@/testUtils/factories/deploymentFactories";
import {
  CONTROL_ROOM_OAUTH_INTEGRATION_ID,
  PIXIEBRIX_INTEGRATION_ID,
} from "@/integrations/constants";
import getModDefinitionIntegrationIds from "@/integrations/util/getModDefinitionIntegrationIds";
import { getExtensionVersion } from "@/utils/extensionUtils";
import { validateTimestamp } from "@/utils/timeUtils";
import {
  modInstanceFactory,
  teamDeploymentMetadataFactory,
} from "@/testUtils/factories/modInstanceFactories";
import { mapActivatedModComponentsToModInstance } from "@/store/modComponents/modInstanceUtils";
import { normalizeSemVerString } from "@/types/semVerHelpers";

describe("makeUpdatedFilter", () => {
  test.each([[{ restricted: true }, { restricted: false }]])(
    "unassigned deployment",
    ({ restricted }) => {
      const modInstances = [modInstanceFactory()];

      const filter = makeUpdatedFilter(modInstances, { restricted });
      expect(filter(deploymentFactory())).toBeTrue();
    },
  );

  test.each([[{ restricted: true }, { restricted: false }]])(
    "matched up-to-date deployment",
    ({ restricted }) => {
      const deployment = deploymentFactory();

      const modInstance = modInstanceFactory({
        deploymentMetadata: {
          id: deployment.id,
          timestamp: deployment.updated_at!,
          active: true,
        },
      });

      const filter = makeUpdatedFilter([modInstance], { restricted });
      expect(filter(deployment)).toBeFalse();
    },
  );

  test.each([[{ restricted: true }, { restricted: false }]])(
    "matched stale deployment",
    ({ restricted }) => {
      const deployment = deploymentFactory();

      const modInstance = modInstanceFactory({
        deploymentMetadata: {
          id: deployment.id,
          timestamp: "2020-10-07T12:52:16.189Z",
          active: true,
        },
      });

      const filter = makeUpdatedFilter([modInstance], { restricted });
      expect(filter(deployment)).toBeTrue();
    },
  );

  test("matched mod for restricted user", () => {
    const { deployment, modDefinition } = activatableDeploymentFactory();

    const modInstance = mapActivatedModComponentsToModInstance([
      activatedModComponentFactory({
        deploymentMetadata: undefined,
        modMetadata: {
          ...modDefinition.metadata,
          updated_at: validateTimestamp(deployment.updated_at!),
          // `sharing` doesn't impact the predicate. Pass an arbitrary value
          sharing: null,
        },
      }),
    ]);

    const filter = makeUpdatedFilter([modInstance], { restricted: true });
    expect(filter(deployment)).toBeTrue();
  });

  test("matched blueprint for unrestricted user / developer", () => {
    const { deployment, modDefinition } = activatableDeploymentFactory();

    const modInstance = mapActivatedModComponentsToModInstance([
      activatedModComponentFactory({
        deploymentMetadata: undefined,
        modMetadata: {
          ...modDefinition.metadata,
          // The factory produces version "1.0.1"
          version: normalizeSemVerString("1.0.1"),
          updated_at: validateTimestamp(deployment.updated_at!),
          // `sharing` doesn't impact the predicate. Pass an arbitrary value
          sharing: null,
        },
      }),
    ]);

    const filter = makeUpdatedFilter([modInstance], { restricted: false });
    expect(filter(deployment)).toBeFalse();
  });
});

describe("checkExtensionUpdateRequired", () => {
  test("no deployments", () => {
    expect(checkExtensionUpdateRequired([])).toBeFalse();
  });

  test("update required", () => {
    const { deployment, modDefinition } = activatableDeploymentFactory();
    (modDefinition.metadata.extensionVersion as any) = ">=99.99.99";

    expect(
      checkExtensionUpdateRequired([{ deployment, modDefinition }]),
    ).toBeTrue();
  });

  test("update not required", () => {
    const { deployment, modDefinition } = activatableDeploymentFactory();
    (modDefinition.metadata.extensionVersion as any) =
      `>=${getExtensionVersion()}`;

    expect(
      checkExtensionUpdateRequired([{ deployment, modDefinition }]),
    ).toBeFalse();
  });
});

describe("isDeploymentActive", () => {
  test("not a deployment", () => {
    expect(isDeploymentActive(modComponentFactory())).toBeTrue();
  });

  test("legacy deployment", () => {
    const deployment = deploymentFactory();

    const modComponent = modComponentFactory({
      deploymentMetadata: {
        id: deployment.id,
        timestamp: deployment.updated_at!,
        // Legacy deployments don't have an `active` field
      },
    });

    expect(isDeploymentActive(modComponent)).toBeTrue();
  });

  test.each([[{ active: true }, { active: false }]])(
    "deployment",
    ({ active }) => {
      const deployment = deploymentFactory();

      const modComponent = modComponentFactory({
        deploymentMetadata: {
          id: deployment.id,
          timestamp: deployment.updated_at!,
          active,
        },
      });

      expect(isDeploymentActive(modComponent)).toBe(active);
    },
  );
});

describe("getIntegrationIds", () => {
  test("find unique integration ids", async () => {
    const { modDefinition } = activatableDeploymentFactory({
      modDefinitionOverride: {
        extensionPoints: [
          modComponentDefinitionFactory({
            services: {
              [validateOutputKey("foo")]: CONTROL_ROOM_OAUTH_INTEGRATION_ID,
              [validateOutputKey("bar")]: CONTROL_ROOM_OAUTH_INTEGRATION_ID,
            },
          }),
        ],
      },
    });

    expect(getModDefinitionIntegrationIds(modDefinition)).toStrictEqual([
      CONTROL_ROOM_OAUTH_INTEGRATION_ID,
    ]);
  });
});

describe("findLocalDeploymentConfiguredIntegrationDependencies", () => {
  test("missing personal integration", async () => {
    const activatableDeployment = activatableDeploymentFactory({
      modDefinitionOverride: {
        extensionPoints: [
          modComponentDefinitionFactory({
            services: {
              [validateOutputKey("foo")]: CONTROL_ROOM_OAUTH_INTEGRATION_ID,
            },
          }),
        ],
      },
    });

    const locator = async () => [] as SanitizedIntegrationConfig[];
    await expect(
      findLocalDeploymentConfiguredIntegrationDependencies(
        activatableDeployment,
        locator,
      ),
    ).resolves.toStrictEqual([
      {
        integrationId: CONTROL_ROOM_OAUTH_INTEGRATION_ID,
        outputKey: "foo",
        isOptional: false,
        apiVersion: "v1",
        configs: [],
      },
    ]);
  });

  test("found personal integration", async () => {
    const activatableDeployment = activatableDeploymentFactory({
      modDefinitionOverride: {
        extensionPoints: [
          modComponentDefinitionFactory({
            services: {
              [validateOutputKey("foo")]: CONTROL_ROOM_OAUTH_INTEGRATION_ID,
            },
          }),
        ],
      },
    });

    const auth = sanitizedIntegrationConfigFactory({
      serviceId: CONTROL_ROOM_OAUTH_INTEGRATION_ID,
    });

    const locator = async () => [auth];
    await expect(
      findLocalDeploymentConfiguredIntegrationDependencies(
        activatableDeployment,
        locator,
      ),
    ).resolves.toStrictEqual([
      {
        integrationId: CONTROL_ROOM_OAUTH_INTEGRATION_ID,
        outputKey: "foo",
        isOptional: false,
        apiVersion: "v1",
        configs: [auth],
      },
    ]);
  });

  test("exclude bound integrations", async () => {
    const registryId = validateRegistryId("test/bound");

    const activatableDeployment = activatableDeploymentFactory({
      deploymentOverride: {
        bindings: [{ auth: { id: uuidv4(), service_id: registryId } }],
      },
      modDefinitionOverride: {
        extensionPoints: [
          modComponentDefinitionFactory({
            services: {
              [validateOutputKey("foo")]: registryId,
            },
          }),
        ],
      },
    });

    const auth = sanitizedIntegrationConfigFactory({
      serviceId: registryId,
    });

    const locator = async () => [auth];
    await expect(
      findLocalDeploymentConfiguredIntegrationDependencies(
        activatableDeployment,
        locator,
      ),
    ).resolves.toBeArrayOfSize(0);
  });

  test("exclude pixiebrix integration", async () => {
    const activatableDeployment = activatableDeploymentFactory({
      modDefinitionOverride: {
        extensionPoints: [
          modComponentDefinitionFactory({
            services: {
              [validateOutputKey("foo")]: PIXIEBRIX_INTEGRATION_ID,
            },
          }),
        ],
      },
    });

    const auth = sanitizedIntegrationConfigFactory({
      serviceId: PIXIEBRIX_INTEGRATION_ID,
    });

    const locator = async () => [auth];
    await expect(
      findLocalDeploymentConfiguredIntegrationDependencies(
        activatableDeployment,
        locator,
      ),
    ).resolves.toBeArrayOfSize(0);
  });
});

describe("mergeDeploymentIntegrationDependencies", () => {
  test("prefer bound integration dependencies", async () => {
    const registryId = validateRegistryId("test/bound");
    const boundId = uuidv4();

    const activatableDeployment = activatableDeploymentFactory({
      deploymentOverride: {
        bindings: [{ auth: { id: boundId, service_id: registryId } }],
      },
      modDefinitionOverride: {
        extensionPoints: [
          modComponentDefinitionFactory({
            services: {
              [validateOutputKey("foo")]: registryId,
            },
          }),
        ],
      },
    });

    const auth = sanitizedIntegrationConfigFactory({
      serviceId: registryId,
    });

    const locator = async () => [auth];
    await expect(
      mergeDeploymentIntegrationDependencies(activatableDeployment, locator),
    ).resolves.toStrictEqual([
      {
        integrationId: registryId,
        outputKey: "foo",
        configId: boundId,
        isOptional: false,
        apiVersion: "v1",
      },
    ]);
  });

  test("take local integration dependency", async () => {
    const activatableDeployment = activatableDeploymentFactory({
      modDefinitionOverride: {
        extensionPoints: [
          modComponentDefinitionFactory({
            services: {
              [validateOutputKey("foo")]: CONTROL_ROOM_OAUTH_INTEGRATION_ID,
            },
          }),
        ],
      },
    });

    const auth = sanitizedIntegrationConfigFactory({
      serviceId: CONTROL_ROOM_OAUTH_INTEGRATION_ID,
    });

    const locator = async () => [auth];
    await expect(
      mergeDeploymentIntegrationDependencies(activatableDeployment, locator),
    ).resolves.toStrictEqual([
      {
        integrationId: CONTROL_ROOM_OAUTH_INTEGRATION_ID,
        outputKey: "foo",
        configId: auth.id,
        isOptional: false,
        apiVersion: "v1",
      },
    ]);
  });

  test("ignore personal remote integration dependency", async () => {
    const activatableDeployment = activatableDeploymentFactory({
      modDefinitionOverride: {
        extensionPoints: [
          modComponentDefinitionFactory({
            services: {
              [validateOutputKey("foo")]: CONTROL_ROOM_OAUTH_INTEGRATION_ID,
            },
          }),
        ],
      },
    });

    const auth = sanitizedIntegrationConfigFactory({
      serviceId: CONTROL_ROOM_OAUTH_INTEGRATION_ID,
      proxy: true,
    });

    const locator = async () => [auth];
    await expect(
      mergeDeploymentIntegrationDependencies(activatableDeployment, locator),
    ).rejects.toThrow("No configuration found for integration");
  });

  test("reject multiple personal configurations", async () => {
    const activatableDeployment = activatableDeploymentFactory({
      modDefinitionOverride: {
        extensionPoints: [
          modComponentDefinitionFactory({
            services: {
              [validateOutputKey("foo")]: CONTROL_ROOM_OAUTH_INTEGRATION_ID,
            },
          }),
        ],
      },
    });

    const locator = async () => [
      sanitizedIntegrationConfigFactory({
        serviceId: CONTROL_ROOM_OAUTH_INTEGRATION_ID,
        proxy: false,
      }),
      sanitizedIntegrationConfigFactory({
        serviceId: CONTROL_ROOM_OAUTH_INTEGRATION_ID,
        proxy: false,
      }),
    ];
    await expect(
      mergeDeploymentIntegrationDependencies(activatableDeployment, locator),
    ).rejects.toThrow("Multiple local configurations found for integration:");
  });

  test("preserve PixieBrix Integration placeholder if included", async () => {
    const activatableDeployment = activatableDeploymentFactory({
      modDefinitionOverride: {
        extensionPoints: [
          modComponentDefinitionFactory({
            services: {
              // @ts-expect-error - this is a placeholder
              pixiebrix: PIXIEBRIX_INTEGRATION_ID,
            },
          }),
        ],
      },
    });

    const auth = sanitizedIntegrationConfigFactory({
      serviceId: PIXIEBRIX_INTEGRATION_ID,
    });

    const locator = async () => [auth];
    await expect(
      mergeDeploymentIntegrationDependencies(activatableDeployment, locator),
    ).resolves.toStrictEqual([
      {
        integrationId: PIXIEBRIX_INTEGRATION_ID,
        outputKey: "pixiebrix",
        isOptional: false,
        apiVersion: "v1",
      },
    ]);
  });
});

describe("selectActivatedDeployments", () => {
  it("selects deployment", () => {
    const manualMod = modInstanceFactory();
    const deploymentMod = modInstanceFactory({
      deploymentMetadata: teamDeploymentMetadataFactory(),
    });

    const result = selectActivatedDeployments([manualMod, deploymentMod]);

    expect(result).toStrictEqual([
      {
        deployment: deploymentMod.deploymentMetadata!.id,
        blueprint: deploymentMod.definition.metadata.id,
        blueprintVersion: deploymentMod.definition.metadata.version,
      },
    ]);
  });
});
