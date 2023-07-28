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

import { array, define, extend } from "cooky-cutter";
import {
  type ModComponentDefinition,
  type ModDefinition,
} from "@/types/modDefinitionTypes";
import {
  type InnerDefinitionRef,
  type InnerDefinitions,
  type Metadata,
  type RegistryId,
} from "@/types/registryTypes";
import { type OutputKey } from "@/types/runtimeTypes";
import { type Permissions } from "webextension-polyfill";
import { emptyPermissionsFactory } from "@/permissions/permissionsUtils";
import { type BrickPipeline } from "@/bricks/types";
import { sharingDefinitionFactory } from "@/testUtils/factories/registryFactories";
import {
  validateRegistryId,
  validateSemVerString,
  validateTimestamp,
} from "@/types/helpers";
import {
  type StarterBrickConfig,
  type StarterBrickType,
  type StarterBrickDefinition,
} from "@/starterBricks/types";
import { freshIdentifier } from "@/utils";
import { DEFAULT_EXTENSION_POINT_VAR } from "@/pageEditor/starterBricks/base";
import { type SafeString } from "@/types/stringTypes";

import {
  remoteIntegrationConfigurationFactory,
  remoteIntegrationServiceFactory,
} from "@/testUtils/factories/integrationFactories";

export const metadataFactory = define<Metadata>({
  id: (n: number) => validateRegistryId(`test/mod-${n}`),
  name: (n: number) => `Mod ${n}`,
  description: "Mod generated from factory",
  version: validateSemVerString("1.0.0"),
});

export const modComponentDefinitionFactory = define<ModComponentDefinition>({
  id: "extensionPoint" as InnerDefinitionRef,
  label: (n: number) => `Test Mod ${n}`,
  services(): Record<OutputKey, RegistryId> {
    return {};
  },
  permissions(): Permissions.Permissions {
    return emptyPermissionsFactory();
  },
  config: () => ({
    caption: "Button",
    action: [] as BrickPipeline,
  }),
});

export const modDefinitionFactory = define<ModDefinition>({
  kind: "recipe",
  apiVersion: "v3",
  metadata: metadataFactory,
  sharing: sharingDefinitionFactory,
  updated_at: validateTimestamp("2021-10-07T12:52:16.189Z"),
  extensionPoints: array(modComponentDefinitionFactory, 1),
});

export const starterBrickConfigFactory = define<StarterBrickConfig>({
  kind: "extensionPoint",
  apiVersion: "v3",
  metadata: (n: number) =>
    metadataFactory({
      id: validateRegistryId(`test/starter-brick-${n}`),
      name: `Starter Brick ${n}`,
    }),
  definition(n: number) {
    const definition: StarterBrickDefinition = {
      type: "menuItem" as StarterBrickType,
      isAvailable: {
        matchPatterns: [`https://www.mySite${n}.com/*`],
      },
      reader: validateRegistryId("@pixiebrix/document-context"),
    };
    return definition;
  },
});

type ExternalStarterBrickParams = {
  extensionPointId?: RegistryId;
};

/**
 * Factory to create a ModDefinition that refers to a versioned StarterBrick
 */
export const modDefinitionWithVersionedStarterBrickFactory = ({
  extensionPointId,
}: ExternalStarterBrickParams = {}) =>
  extend<ModDefinition, ModDefinition>(modDefinitionFactory, {
    definitions: undefined,
    options: undefined,
    extensionPoints: (n: number) => [
      {
        id: extensionPointId ?? validateRegistryId("test/starter-brick"),
        label: `Test Starter Brick for Mod ${n}`,
        services: {},
        permissions: emptyPermissionsFactory(),
        config: {
          caption: "Button",
          action: [] as BrickPipeline,
        },
      },
    ],
  });

/**
 * Factory to create a ModDefinition with a definitions section and resolved mod components
 */
export const versionedModDefinitionWithResolvedModComponents = (
  modComponentCount = 1
) => {
  const modComponentDefinitions: ModComponentDefinition[] = [];
  for (let i = 0; i < modComponentCount; i++) {
    // Don't use array(factory, count) here, because it will keep incrementing
    // the modifier number across multiple test runs and cause non-deterministic
    // test execution behavior.
    const modComponent = modComponentDefinitionFactory();
    const ids = modComponentDefinitions.map((x) => x.id);
    const id = freshIdentifier(DEFAULT_EXTENSION_POINT_VAR as SafeString, ids);
    modComponentDefinitions.push({
      ...modComponent,
      id: id as InnerDefinitionRef,
    });
  }

  const definitions: InnerDefinitions = {};

  for (const modComponentDefinition of modComponentDefinitions) {
    definitions[modComponentDefinition.id] = {
      kind: "extensionPoint",
      definition: starterBrickConfigFactory().definition,
    };
  }

  return extend<ModDefinition, ModDefinition>(modDefinitionFactory, {
    definitions,
    options: undefined,
    extensionPoints: modComponentDefinitions,
  });
};

type InnerStarterBrickParams = {
  extensionPointRef?: InnerDefinitionRef;
};

/**
 * Factory to create a factory that creates a ModDefinition that contains inner definitions
 */
export const innerStarterBrickModDefinitionFactory = ({
  extensionPointRef = "extensionPoint" as InnerDefinitionRef,
}: InnerStarterBrickParams = {}) =>
  extend<ModDefinition, ModDefinition>(modDefinitionFactory, {
    definitions: (): InnerDefinitions => ({
      [extensionPointRef]: {
        kind: "extensionPoint",
        definition: {
          type: "menuItem",
          isAvailable: {
            matchPatterns: ["https://*/*"],
            urlPatterns: [],
            selectors: [],
          },
          reader: validateRegistryId("@pixiebrix/document-context"),
        },
      },
    }),
    options: undefined,
    extensionPoints: () => [
      modComponentDefinitionFactory({ id: extensionPointRef }),
    ],
  });

/**
 * A default Mod Definition factory
 */
export const defaultModDefinitionFactory =
  innerStarterBrickModDefinitionFactory();

export const getModDefinitionWithBuiltInServiceAuths = () => {
  const extensionServices = {
    service1: "@pixiebrix/service1",
    service2: "@pixiebrix/service2",
  } as Record<OutputKey, RegistryId>;

  const modComponentDefinition = modComponentDefinitionFactory({
    services: extensionServices,
  });

  const modDefinition = defaultModDefinitionFactory({
    extensionPoints: [modComponentDefinition],
  });

  const builtInServiceAuths = [
    remoteIntegrationConfigurationFactory({
      service: remoteIntegrationServiceFactory({
        config: {
          metadata: {
            id: validateRegistryId("@pixiebrix/service1"),
            name: "Service 1",
          },
        },
      }),
    }),
    remoteIntegrationConfigurationFactory({
      service: remoteIntegrationServiceFactory({
        config: {
          metadata: {
            id: validateRegistryId("@pixiebrix/service2"),
            name: "Service 2",
          },
        },
      }),
    }),
  ];

  return { modDefinition, builtInServiceAuths };
};
