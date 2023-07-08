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

import { define, derive } from "cooky-cutter";
import { type Deployment } from "@/types/contract";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import { validateTimestamp } from "@/types/helpers";
import { type RegistryId } from "@/types/registryTypes";
import { recipeDefinitionFactory } from "@/testUtils/factories/recipeFactories";

// Deployments are returned from the API, but their shape is determined by the registry and RecipeDefinition type.

export const deploymentPackageFactory = define<Deployment["package"]>({
  id: uuidSequence,
  name: derive<Deployment["package"], string>(
    ({ config }) => config.metadata.name,
    "config"
  ),
  version: derive<Deployment["package"], string>(
    ({ config }) => config.metadata.version,
    "config"
  ),
  package_id: derive<Deployment["package"], RegistryId>(
    ({ config }) => config.metadata.id,
    "config"
  ),
  config: recipeDefinitionFactory,
});
export const deploymentFactory = define<Deployment>({
  id: uuidSequence,
  name: (n: number) => `Deployment ${n}`,
  created_at: validateTimestamp("2021-10-07T12:52:16.189Z"),
  updated_at: validateTimestamp("2021-10-07T12:52:16.189Z"),
  active: true,
  bindings: () => [] as Deployment["bindings"],
  services: () => [] as Deployment["services"],
  package_version: derive<Deployment, string>(
    ({ package: deploymentPackage }) => deploymentPackage.version,
    "package"
  ),
  package: deploymentPackageFactory,
  options_config: () => ({} as Deployment["options_config"]),
});
