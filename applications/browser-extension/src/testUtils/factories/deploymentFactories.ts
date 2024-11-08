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

import { define, derive, type FactoryConfig } from "cooky-cutter";
import { type Deployment } from "@/types/contract";
import { type ActivatableDeployment } from "@/types/deploymentTypes";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import { validateRegistryId, normalizeSemVerString } from "@/types/helpers";
import { defaultModDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { validateTimestamp } from "@/utils/timeUtils";

// Deployments are returned from the API, but their shape is determined by the registry and ModDefinition type.

const deploymentPackageFactory = define<Deployment["package"]>({
  id: uuidSequence,
  name: "Test Starter Brick",
  version: (n: number) => normalizeSemVerString(`1.0.${n}`),
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
    ({ package: deploymentPackage }) => deploymentPackage!.version!,
    "package",
  ),
  package: deploymentPackageFactory,
  options_config: () => ({}) as Deployment["options_config"],
});

export function activatableDeploymentFactory({
  deploymentOverride,
  modDefinitionOverride,
}: {
  deploymentOverride?: FactoryConfig<Deployment>;
  modDefinitionOverride?: FactoryConfig<ModDefinition>;
} = {}): ActivatableDeployment {
  const modDefinition = defaultModDefinitionFactory(modDefinitionOverride);

  if (deploymentOverride && "package" in deploymentOverride) {
    throw new Error(
      "You cannot override the deployment's package because it is derived from the mod definition",
    );
  }

  const deployment = deploymentFactory({
    ...deploymentOverride,
    package: deploymentPackageFactory({
      name: modDefinition.metadata.name,
      version: modDefinition.metadata.version,
      package_id: modDefinition.metadata.id,
    }),
  });

  return { deployment, modDefinition };
}
