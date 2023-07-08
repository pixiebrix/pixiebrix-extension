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
  type IExtension,
  type PersistedExtension,
} from "@/types/extensionTypes";
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
import { type ServiceDependency } from "@/types/serviceTypes";
import { sharingDefinitionFactory } from "@/testUtils/factories/registryFactories";
import { recipeMetadataFactory } from "@/testUtils/factories/recipeFactories";
import { type CloudExtension } from "@/types/contract";

export const installedRecipeMetadataFactory = define<IExtension["_recipe"]>({
  id: (n: number) => validateRegistryId(`test/recipe-${n}`),
  name: (n: number) => `Recipe ${n}`,
  description: "Recipe generated from factory",
  version: validateSemVerString("1.0.0"),
  updated_at: validateTimestamp("2021-10-07T12:52:16.189Z"),
  sharing: sharingDefinitionFactory,
});
export const extensionFactory = define<IExtension>({
  id: uuidSequence,
  apiVersion: "v3" as ApiVersion,
  extensionPointId: (n: number) =>
    validateRegistryId(`test/extension-point-${n}`),
  _recipe: undefined,
  _deployment: undefined,
  label: "Test label",
  services(): ServiceDependency[] {
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
export const persistedExtensionFactory = extend<IExtension, PersistedExtension>(
  extensionFactory,
  {
    createTimestamp: timestampFactory,
    updateTimestamp: timestampFactory,
    _unresolvedExtensionBrand: undefined,
    active: true,
  }
);

// CloudExtension is a type in contract.ts. But it's really defined based on the IExtension type not the backend API.
export const cloudExtensionFactory = (
  override?: Partial<Config<CloudExtension>>
) => {
  const extension = extensionFactory(
    override as Config<IExtension>
  ) as CloudExtension;

  // @ts-expect-error -- removing the IExtension property that is not in the CloudExtension type
  delete extension.active;

  const timestamp = timestampFactory();
  extension.createTimestamp = timestamp;
  extension.updateTimestamp = timestamp;

  return extension;
};
