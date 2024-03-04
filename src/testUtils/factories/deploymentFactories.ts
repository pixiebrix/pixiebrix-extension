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

import { define, derive } from "cooky-cutter";
import { type Deployment } from "@/types/contract";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import {
  validateRegistryId,
  validateSemVerString,
  validateTimestamp,
} from "@/types/helpers";

// Deployments are returned from the API, but their shape is determined by the registry and ModDefinition type.

// TODO: would be nice to generate this from a package config object but I'm not sure how to do this
export const deploymentPackageFactory = define<Deployment["package"]>({
  id: uuidSequence,
  name: "Test Starter Brick",
  version: (n: number) => validateSemVerString(`1.0.${n}`),
  package_id: (n: number) => validateRegistryId(`test/starter-brick-${n}`),
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
    "package",
  ),
  package: deploymentPackageFactory,
  options_config: () => ({}) as Deployment["options_config"],
});
