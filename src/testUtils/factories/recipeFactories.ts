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

import { array, define } from "cooky-cutter";
import {
  type ModComponentDefinition,
  type ModDefinition,
} from "@/types/modDefinitionTypes";
import {
  type InnerDefinitionRef,
  type InnerDefinitions,
  type Metadata,
  type RegistryId,
  type Sharing,
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
  sanitizedAuthFactory,
  sanitizedAuthServiceFactory,
} from "@/testUtils/factories/integrationFactories";

export const recipeMetadataFactory = define<Metadata>({
  id: (n: number) => validateRegistryId(`test/recipe-${n}`),
  name: (n: number) => `Recipe ${n}`,
  description: "Recipe generated from factory",
  version: validateSemVerString("1.0.0"),
});

export const modComponentDefinitionFactory = define<ModComponentDefinition>({
  id: "extensionPoint" as InnerDefinitionRef,
  label: (n: number) => `Test Extension ${n}`,
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
  metadata: (n: number) =>
    recipeMetadataFactory({
      id: validateRegistryId(`test/blueprint-${n}`),
      name: `Blueprint ${n}`,
    }),
  updated_at: validateTimestamp("2021-10-07T12:52:16.189Z"),
  sharing: sharingDefinitionFactory,
  extensionPoints: array(modComponentDefinitionFactory, 1),
});

export const starterBrickConfigFactory = define<StarterBrickConfig>({
  kind: "extensionPoint",
  apiVersion: "v3",
  metadata: (n: number) =>
    recipeMetadataFactory({
      id: validateRegistryId(`test/extension-point-${n}`),
      name: `Extension Point ${n}`,
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
export const versionedStarterBrickRecipeFactory = ({
  extensionPointId,
}: ExternalStarterBrickParams = {}) =>
  define<ModDefinition>({
    kind: "recipe",
    apiVersion: "v3",
    metadata: (n: number) => ({
      id: validateRegistryId(`test/recipe-${n}`),
      name: `Recipe ${n}`,
      description: "Recipe generated from factory",
      version: validateSemVerString("1.0.0"),
    }),
    sharing: sharingDefinitionFactory,
    updated_at: validateTimestamp("2021-10-07T12:52:16.189Z"),
    definitions: undefined,
    options: undefined,
    extensionPoints: (n: number) => [
      {
        id: extensionPointId ?? validateRegistryId("test/extension-point"),
        label: `Test Extension for Recipe ${n}`,
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
 * Factory to create a ModDefinition with a definitions section and resolved extensions
 */
export const versionedRecipeWithResolvedExtensions = (extensionCount = 1) => {
  const extensionPoints: ModComponentDefinition[] = [];
  for (let i = 0; i < extensionCount; i++) {
    // Don't use array(factory, count) here, because it will keep incrementing
    // the modifier number across multiple test runs and cause non-deterministic
    // test execution behavior.
    const extensionPoint = modComponentDefinitionFactory();
    const ids = extensionPoints.map((x) => x.id);
    const id = freshIdentifier(DEFAULT_EXTENSION_POINT_VAR as SafeString, ids);
    extensionPoints.push({
      ...extensionPoint,
      id: id as InnerDefinitionRef,
    });
  }

  const definitions: InnerDefinitions = {};

  for (const extensionPoint of extensionPoints) {
    definitions[extensionPoint.id] = {
      kind: "extensionPoint",
      definition: starterBrickConfigFactory().definition,
    };
  }

  return define<ModDefinition>({
    kind: "recipe",
    apiVersion: "v3",
    metadata: (n: number) => ({
      id: validateRegistryId(`test/recipe-${n}`),
      name: `Recipe ${n}`,
      description: "Recipe generated from factory",
      version: validateSemVerString("1.0.0"),
    }),
    sharing: sharingDefinitionFactory,
    updated_at: validateTimestamp("2021-10-07T12:52:16.189Z"),
    definitions,
    options: undefined,
    extensionPoints,
  });
};

type InnerStarterBrickParams = {
  extensionPointRef?: InnerDefinitionRef;
};
/**
 * Factory to create a factory that creates a ModDefinition that refers to a versioned extensionPoint
 */
export const innerStarterBrickRecipeFactory = ({
  extensionPointRef = "extensionPoint" as InnerDefinitionRef,
}: InnerStarterBrickParams = {}) =>
  define<ModDefinition>({
    kind: "recipe",
    apiVersion: "v3",
    metadata: recipeMetadataFactory,
    sharing: (): Sharing => ({ public: false, organizations: [] }),
    updated_at: validateTimestamp("2021-10-07T12:52:16.189Z"),
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
 * A default Recipe factory
 */
export const recipeFactory = innerStarterBrickRecipeFactory();
export const getRecipeWithBuiltInServiceAuths = () => {
  const extensionServices = {
    service1: "@pixiebrix/service1",
    service2: "@pixiebrix/service2",
  } as Record<OutputKey, RegistryId>;

  const extensionPointDefinition = modComponentDefinitionFactory({
    services: extensionServices,
  });

  const recipe = recipeFactory({
    extensionPoints: [extensionPointDefinition],
  });

  const builtInServiceAuths = [
    sanitizedAuthFactory({
      service: sanitizedAuthServiceFactory({
        config: {
          metadata: {
            id: validateRegistryId("@pixiebrix/service1"),
            name: "Service 1",
          },
        },
      }),
    }),
    sanitizedAuthFactory({
      service: sanitizedAuthServiceFactory({
        config: {
          metadata: {
            id: validateRegistryId("@pixiebrix/service2"),
            name: "Service 2",
          },
        },
      }),
    }),
  ];

  return { recipe, builtInServiceAuths };
};
