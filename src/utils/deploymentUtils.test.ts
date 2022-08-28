/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
  extractRecipeServiceIds,
  findLocalDeploymentServiceConfigurations,
  isDeploymentActive,
  makeUpdatedFilter,
  mergeDeploymentServiceConfigurations,
} from "./deploymentUtils";
import {
  deploymentFactory,
  deploymentPackageFactory,
  extensionFactory,
  extensionPointConfigFactory,
  recipeDefinitionFactory,
  sanitizedServiceConfigurationFactory,
} from "@/testUtils/factories";
import {
  uuidv4,
  validateRegistryId,
  validateSemVerString,
  validateTimestamp,
} from "@/types/helpers";
import {
  CONTROL_ROOM_OAUTH_SERVICE_ID,
  PIXIEBRIX_SERVICE_ID,
} from "@/services/constants";
import { SanitizedServiceConfiguration } from "@/core";
import { validateOutputKey } from "@/runtime/runtimeTypes";

describe("makeUpdatedFilter", () => {
  test.each([[{ restricted: true }, { restricted: false }]])(
    "unmatched deployment",
    ({ restricted }) => {
      const extensions = [extensionFactory()];

      const filter = makeUpdatedFilter(extensions, { restricted });
      expect(filter(deploymentFactory())).toBeTrue();
    }
  );

  test.each([[{ restricted: true }, { restricted: false }]])(
    "matched up-to-date deployment",
    ({ restricted }) => {
      const deployment = deploymentFactory();

      const extensions = [
        extensionFactory({
          _deployment: {
            id: deployment.id,
            timestamp: deployment.updated_at,
            active: true,
          },
        }),
      ];

      const filter = makeUpdatedFilter(extensions, { restricted });
      expect(filter(deployment)).toBeFalse();
    }
  );

  test.each([[{ restricted: true }, { restricted: false }]])(
    "matched stale deployment",
    ({ restricted }) => {
      const deployment = deploymentFactory();

      const extensions = [
        extensionFactory({
          _deployment: {
            id: deployment.id,
            timestamp: "2020-10-07T12:52:16.189Z",
            active: true,
          },
        }),
      ];

      const filter = makeUpdatedFilter(extensions, { restricted });
      expect(filter(deployment)).toBeTrue();
    }
  );

  test("matched blueprint for restricted user", () => {
    const deployment = deploymentFactory();

    const extensions = [
      extensionFactory({
        _deployment: undefined,
        _recipe: {
          ...deployment.package.config.metadata,
          updated_at: validateTimestamp(deployment.updated_at),
          // `sharing` doesn't impact the predicate. Pass an arbitrary value
          sharing: undefined,
        },
      }),
    ];

    const filter = makeUpdatedFilter(extensions, { restricted: true });
    expect(filter(deployment)).toBeTrue();
  });

  test("matched blueprint for unrestricted user / developer", () => {
    const deployment = deploymentFactory();

    const extensions = [
      extensionFactory({
        _deployment: undefined,
        _recipe: {
          ...deployment.package.config.metadata,
          // The factory produces version "1.0.1"
          version: validateSemVerString("1.0.1"),
          updated_at: validateTimestamp(deployment.updated_at),
          // `sharing` doesn't impact the predicate. Pass an arbitrary value
          sharing: undefined,
        },
      }),
    ];

    const filter = makeUpdatedFilter(extensions, { restricted: false });
    expect(filter(deployment)).toBeFalse();
  });
});

describe("checkExtensionUpdateRequired", () => {
  test("no deployments", () => {
    expect(checkExtensionUpdateRequired([])).toBeFalse();
  });

  test("update required", () => {
    const deployment = deploymentFactory();
    (deployment.package.config.metadata.extensionVersion as any) = ">=99.99.99";

    expect(checkExtensionUpdateRequired([deployment])).toBeTrue();
  });

  test("update not required", () => {
    const deployment = deploymentFactory();
    (deployment.package.config.metadata.extensionVersion as any) = `>=${
      browser.runtime.getManifest().version
    }`;
    expect(checkExtensionUpdateRequired([deployment])).toBeFalse();
  });
});

describe("isDeploymentActive", () => {
  test("not a deployment", () => {
    expect(isDeploymentActive(extensionFactory())).toBeTrue();
  });

  test("legacy deployment", () => {
    const deployment = deploymentFactory();

    const extension = extensionFactory({
      _deployment: {
        id: deployment.id,
        timestamp: deployment.updated_at,
        // Legacy deployments don't have an `active` field
      },
    });

    expect(isDeploymentActive(extension)).toBeTrue();
  });

  test.each([[{ active: true }, { active: false }]])(
    "deployment",
    ({ active }) => {
      const deployment = deploymentFactory();

      const extension = extensionFactory({
        _deployment: {
          id: deployment.id,
          timestamp: deployment.updated_at,
          active,
        },
      });

      expect(isDeploymentActive(extension)).toBe(active);
    }
  );
});

describe("extractRecipeServiceIds", () => {
  test("find unique service ids", async () => {
    const deployment = deploymentFactory({
      package: deploymentPackageFactory({
        config: recipeDefinitionFactory({
          extensionPoints: [
            extensionPointConfigFactory({
              services: {
                [validateOutputKey("foo")]: CONTROL_ROOM_OAUTH_SERVICE_ID,
                [validateOutputKey("bar")]: CONTROL_ROOM_OAUTH_SERVICE_ID,
              },
            }),
          ],
        }),
      }),
    });

    expect(extractRecipeServiceIds(deployment.package.config)).toStrictEqual([
      CONTROL_ROOM_OAUTH_SERVICE_ID,
    ]);
  });
});

describe("findPersonalServiceConfigurations", () => {
  test("missing personal service", async () => {
    const deployment = deploymentFactory({
      package: deploymentPackageFactory({
        config: recipeDefinitionFactory({
          extensionPoints: [
            extensionPointConfigFactory({
              services: {
                [validateOutputKey("foo")]: CONTROL_ROOM_OAUTH_SERVICE_ID,
              },
            }),
          ],
        }),
      }),
    });

    const locator = async () => [] as SanitizedServiceConfiguration[];
    expect(
      await findLocalDeploymentServiceConfigurations(deployment, locator)
    ).toStrictEqual({
      [CONTROL_ROOM_OAUTH_SERVICE_ID]: [],
    });
  });

  test("found personal service", async () => {
    const deployment = deploymentFactory({
      package: deploymentPackageFactory({
        config: recipeDefinitionFactory({
          extensionPoints: [
            extensionPointConfigFactory({
              services: {
                [validateOutputKey("foo")]: CONTROL_ROOM_OAUTH_SERVICE_ID,
              },
            }),
          ],
        }),
      }),
    });

    const auth = sanitizedServiceConfigurationFactory({
      serviceId: CONTROL_ROOM_OAUTH_SERVICE_ID,
    });

    const locator = async () => [auth];
    expect(
      await findLocalDeploymentServiceConfigurations(deployment, locator)
    ).toStrictEqual({
      [CONTROL_ROOM_OAUTH_SERVICE_ID]: [auth],
    });
  });

  test("exclude bound services", async () => {
    const registryId = validateRegistryId("test/bound");

    const deployment = deploymentFactory({
      bindings: [{ auth: { id: uuidv4(), service_id: registryId } }],
      package: deploymentPackageFactory({
        config: recipeDefinitionFactory({
          extensionPoints: [
            extensionPointConfigFactory({
              services: {
                [validateOutputKey("foo")]: registryId,
              },
            }),
          ],
        }),
      }),
    });

    const auth = sanitizedServiceConfigurationFactory({
      serviceId: registryId,
    });

    const locator = async () => [auth];
    expect(
      await findLocalDeploymentServiceConfigurations(deployment, locator)
    ).toStrictEqual({});
  });

  test("exclude pixiebrix service", async () => {
    const deployment = deploymentFactory({
      package: deploymentPackageFactory({
        config: recipeDefinitionFactory({
          extensionPoints: [
            extensionPointConfigFactory({
              services: {
                [validateOutputKey("foo")]: PIXIEBRIX_SERVICE_ID,
              },
            }),
          ],
        }),
      }),
    });

    const auth = sanitizedServiceConfigurationFactory({
      serviceId: PIXIEBRIX_SERVICE_ID,
    });

    const locator = async () => [auth];
    expect(
      await findLocalDeploymentServiceConfigurations(deployment, locator)
    ).toStrictEqual({});
  });
});

describe("mergeDeploymentServiceConfigurations", () => {
  test("prefer bound services", async () => {
    const registryId = validateRegistryId("test/bound");
    const boundId = uuidv4();

    const deployment = deploymentFactory({
      bindings: [{ auth: { id: boundId, service_id: registryId } }],
      package: deploymentPackageFactory({
        config: recipeDefinitionFactory({
          extensionPoints: [
            extensionPointConfigFactory({
              services: {
                [validateOutputKey("foo")]: registryId,
              },
            }),
          ],
        }),
      }),
    });

    const auth = sanitizedServiceConfigurationFactory({
      serviceId: registryId,
    });

    const locator = async () => [auth];
    expect(
      await mergeDeploymentServiceConfigurations(deployment, locator)
    ).toStrictEqual({
      [registryId]: boundId,
    });
  });

  test("take local service", async () => {
    const deployment = deploymentFactory({
      package: deploymentPackageFactory({
        config: recipeDefinitionFactory({
          extensionPoints: [
            extensionPointConfigFactory({
              services: {
                [validateOutputKey("foo")]: CONTROL_ROOM_OAUTH_SERVICE_ID,
              },
            }),
          ],
        }),
      }),
    });

    const auth = sanitizedServiceConfigurationFactory({
      serviceId: CONTROL_ROOM_OAUTH_SERVICE_ID,
    });

    const locator = async () => [auth];
    expect(
      await mergeDeploymentServiceConfigurations(deployment, locator)
    ).toStrictEqual({
      [CONTROL_ROOM_OAUTH_SERVICE_ID]: auth.id,
    });
  });

  test("ignore personal remote service", async () => {
    const deployment = deploymentFactory({
      package: deploymentPackageFactory({
        config: recipeDefinitionFactory({
          extensionPoints: [
            extensionPointConfigFactory({
              services: {
                [validateOutputKey("foo")]: CONTROL_ROOM_OAUTH_SERVICE_ID,
              },
            }),
          ],
        }),
      }),
    });

    const auth = sanitizedServiceConfigurationFactory({
      serviceId: CONTROL_ROOM_OAUTH_SERVICE_ID,
      proxy: true,
    });

    const locator = async () => [auth];
    await expect(
      mergeDeploymentServiceConfigurations(deployment, locator)
    ).rejects.toThrowError("No configuration found for integration");
  });

  test("reject multiple personal configurations", async () => {
    const deployment = deploymentFactory({
      package: deploymentPackageFactory({
        config: recipeDefinitionFactory({
          extensionPoints: [
            extensionPointConfigFactory({
              services: {
                [validateOutputKey("foo")]: CONTROL_ROOM_OAUTH_SERVICE_ID,
              },
            }),
          ],
        }),
      }),
    });

    const locator = async () => [
      sanitizedServiceConfigurationFactory({
        serviceId: CONTROL_ROOM_OAUTH_SERVICE_ID,
        proxy: false,
      }),
      sanitizedServiceConfigurationFactory({
        serviceId: CONTROL_ROOM_OAUTH_SERVICE_ID,
        proxy: false,
      }),
    ];
    await expect(
      mergeDeploymentServiceConfigurations(deployment, locator)
    ).rejects.toThrowError(
      "Multiple local configurations found for integration:"
    );
  });
});
