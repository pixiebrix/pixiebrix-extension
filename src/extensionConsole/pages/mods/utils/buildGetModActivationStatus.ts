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

import { type Mod, type ModActivationStatus } from "@/types/modTypes";
import { type RegistryId } from "@/types/registryTypes";
import { type ModInstance } from "@/types/modInstanceTypes";

export default function buildGetModActivationStatus(
  modInstanceMap: Map<RegistryId, ModInstance>,
): (mod: Mod) => ModActivationStatus {
  return (mod: Mod) => {
    const modInstance = modInstanceMap.get(mod.metadata.id);

    // If there is no mod instance, then the mod is inactive, regardless of deployment status
    if (modInstance == null) {
      return "Inactive";
    }

    const { deploymentMetadata } = modInstance;

    // If not part of a deployment, then the mod is active
    if (!deploymentMetadata) {
      return "Active";
    }

    // If part of a deployment, check deployment status
    if (deploymentMetadata.active) {
      return "Active";
    }

    return "Paused";
  };
}
