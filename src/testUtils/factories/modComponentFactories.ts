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

import { type Config, define, extend } from "cooky-cutter";
import {
  type ModComponentBase,
  type ActivatedModComponent,
} from "@/types/modComponentTypes";
import {
  timestampFactory,
  uuidSequence,
} from "@/testUtils/factories/stringFactories";
import { type ApiVersion } from "@/types/runtimeTypes";
import {
  validateRegistryId,
  validateSemVerString,
  validateTimestamp,
} from "@/types/helpers";
import { type IntegrationDependency } from "@/types/integrationTypes";
import { sharingDefinitionFactory } from "@/testUtils/factories/registryFactories";
import { recipeMetadataFactory } from "@/testUtils/factories/modDefinitionFactories";
import { type StandaloneModDefinition } from "@/types/contract";

export const modComponentRecipeFactory = define<ModComponentBase["_recipe"]>({
  id: (n: number) => validateRegistryId(`test/recipe-${n}`),
  name: (n: number) => `Recipe ${n}`,
  description: "Recipe generated from factory",
  version: validateSemVerString("1.0.0"),
  updated_at: validateTimestamp("2021-10-07T12:52:16.189Z"),
  sharing: sharingDefinitionFactory,
});
export const modComponentFactory = define<ModComponentBase>({
  id: uuidSequence,
  apiVersion: "v3" as ApiVersion,
  extensionPointId: (n: number) =>
    validateRegistryId(`test/extension-point-${n}`),
  _recipe: undefined,
  _deployment: undefined,
  label: "Test label",
  services(): IntegrationDependency[] {
    return [];
  },
  config: (n: number) => ({
    apiVersion: "v3" as ApiVersion,
    kind: "component",
    metadata: recipeMetadataFactory({
      id: validateRegistryId(`test/component-${n}`),
      name: "Test config",
    }),
    inputSchema: {
      $schema: "https://json-schema.org/draft/2019-09/schema#",
      type: "object",
      properties: {},
      required: [] as string[],
    },

    // This is the pipeline prop for the MenuItem extension point, which is the default for extensionPointDefinitionFactory
    action: [
      {
        id: "@pixiebrix/browser/open-tab",
        config: {
          url: "http://www.amazon.com/s",
          params: {
            url: "search-alias={{{department}}}{{^department}}all{{/department}}&field-keywords={{{query}}}",
          },
        },
      },
    ],
  }),
  active: true,
});
export const activatedModComponentFactory = extend<
  ModComponentBase,
  ActivatedModComponent
>(modComponentFactory, {
  createTimestamp: timestampFactory,
  updateTimestamp: timestampFactory,
  _unresolvedModComponentBrand: undefined,
  active: true,
});

// StandaloneModDefinition is a type in contract.ts. But it's really defined based on the ModComponentBase type not the backend API.
export const standaloneModDefinitionFactory = (
  override?: Partial<Config<StandaloneModDefinition>>
) => {
  const modComponent = modComponentFactory(
    override as Config<ModComponentBase>
  ) as StandaloneModDefinition;

  // @ts-expect-error -- removing the ModComponentBase property that is not in the StandaloneModDefinition type
  delete modComponent.active;

  const timestamp = timestampFactory();
  modComponent.createTimestamp = timestamp;
  modComponent.updateTimestamp = timestamp;

  return modComponent;
};
