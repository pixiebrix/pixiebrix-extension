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

import { array, define, extend } from "cooky-cutter";
import {
  type ModComponentDefinition,
  type ModDefinition,
} from "@/types/modDefinitionTypes";
import {
  type InnerDefinitionRef,
  type InnerDefinitions,
  DefinitionKinds,
  type RegistryId,
} from "@/types/registryTypes";
import { type OutputKey } from "@/types/runtimeTypes";
import { type Permissions } from "webextension-polyfill";
import { emptyPermissionsFactory } from "@/permissions/permissionsUtils";
import { type BrickPipeline } from "@/bricks/types";
import { sharingDefinitionFactory } from "@/testUtils/factories/registryFactories";
import { validateRegistryId, validateTimestamp } from "@/types/helpers";
import {
  type StarterBrickDefinitionLike,
  type StarterBrickDefinitionProp,
} from "@/starterBricks/types";
import { StarterBrickKinds } from "@/types/starterBrickTypes";
import { DEFAULT_EXTENSION_POINT_VAR } from "@/pageEditor/starterBricks/base";
import { type SafeString } from "@/types/stringTypes";
import {
  remoteIntegrationConfigurationFactory,
  remoteIntegrationServiceFactory,
} from "@/testUtils/factories/integrationFactories";
import { freshIdentifier } from "@/utils/variableUtils";
import { metadataFactory } from "@/testUtils/factories/metadataFactory";

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
  kind: DefinitionKinds.MOD,
  apiVersion: "v3",
  metadata: metadataFactory,
  sharing: sharingDefinitionFactory,
  updated_at: validateTimestamp("2021-10-07T12:52:16.189Z"),
  extensionPoints: array(modComponentDefinitionFactory, 1),
});

export const starterBrickDefinitionFactory = define<StarterBrickDefinitionLike>(
  {
    kind: DefinitionKinds.STARTER_BRICK,
    apiVersion: "v3",
    metadata: (n: number) =>
      metadataFactory({
        id: validateRegistryId(`test/starter-brick-${n}`),
        name: `Starter Brick ${n}`,
      }),
    definition(n: number) {
      const definition: StarterBrickDefinitionProp = {
        type: StarterBrickKinds.BUTTON,
        isAvailable: {
          matchPatterns: [`https://www.mySite${n}.com/*`],
        },
        reader: validateRegistryId("@pixiebrix/document-context"),
      };
      return definition;
    },
  },
);

// Return as UnknownObject to match InnerDefinitions type. Otherwise, Typescript complains about a missing string
// index signature when assigning the value to InnerDefinitions.
export const starterBrickInnerDefinitionFactory = define<UnknownObject>({
  kind: DefinitionKinds.STARTER_BRICK,
  definition(n: number) {
    const definition: StarterBrickDefinitionProp = {
      type: StarterBrickKinds.BUTTON,
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
 * Factory to create a ModDefinition with a definitions section and hydrated mod components
 */
export const versionedModDefinitionWithHydratedModComponents = (
  modComponentCount = 1,
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
      kind: DefinitionKinds.STARTER_BRICK,
      definition: starterBrickDefinitionFactory().definition,
    } satisfies StarterBrickDefinitionLike;
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
      [extensionPointRef]:
        starterBrickInnerDefinitionFactory() as unknown as UnknownObject,
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

export const getModDefinitionWithBuiltInIntegrationConfigs = ({
  modId,
}: {
  modId?: RegistryId;
} = {}) => {
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

  if (modId) {
    (modDefinition.metadata as any).id = modId;
  }

  const builtInIntegrationConfigs = [
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

  return { modDefinition, builtInIntegrationConfigs };
};
