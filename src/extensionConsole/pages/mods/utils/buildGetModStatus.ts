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

import { type ActivatedModComponent } from "@/types/modComponentTypes";
import { type Mod, type ModStatus } from "@/types/modTypes";

export default function buildGetModStatus(
  activatedModComponents: ActivatedModComponent[],
): (mod: Mod) => ModStatus {
  return (mod: Mod) => {
    const activatedComponentsForMod = activatedModComponents.filter(
      ({ _recipe }) => _recipe?.id === mod.metadata.id,
    );

    // If there are no activated components, then the mod is inactive, regardless of deployment status
    if (activatedComponentsForMod.length === 0) {
      return "Inactive";
    }

    const deploymentFromComponent = activatedComponentsForMod.find(
      ({ _deployment }) => _deployment != null,
    )?._deployment;

    // If not part of a deployment, then the mod is active
    if (!deploymentFromComponent) {
      return "Active";
    }

    // If part of a deployment, check deployment status
    if (
      // Check for null/undefined to preserve backward compatability
      // Prior to extension version 1.4.0, there was no `active` field, because there was no ability to pause deployments
      deploymentFromComponent.active == null ||
      deploymentFromComponent.active
    ) {
      return "Active";
    }

    return "Paused";
  };
}
