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

import type { AuthUserOrganization } from "@/auth/authTypes";
import type { ActivatedModComponent } from "@/types/modComponentTypes";
import type { Mod, SharingSource, SharingType } from "@/types/modTypes";
import { idHasScope } from "@/utils/modUtils";

type ActivatedModComponentWithDeployment = ActivatedModComponent & {
  _deployment: NonNullable<ActivatedModComponent["_deployment"]>;
};

export default function buildGetModSharingSource(
  userScope: string,
  organizations: AuthUserOrganization[],
  activatedModComponents: ActivatedModComponent[],
): (mod: Mod) => SharingSource {
  return (mod: Mod) => {
    let sharingType: SharingType | null;
    const organization = organizations.find(
      (org) => org.id && mod.sharing.organizations.includes(org.id),
    );
    let label: string;
    const modId = mod.metadata.id;

    const activatedModComponentFromDeployment = activatedModComponents.find(
      ({ _recipe, _deployment }) => _recipe?.id === modId && _deployment,
    ) as ActivatedModComponentWithDeployment | undefined;

    if (activatedModComponentFromDeployment) {
      if (
        activatedModComponentFromDeployment._deployment.isPersonalDeployment
      ) {
        sharingType = "PersonalDeployment";
        label = "Personal (Synced)";
      } else {
        sharingType = "Deployment";
        label =
          activatedModComponentFromDeployment._deployment.organization?.name ||
          organization?.name || // In case organization is not on the _deployment object (due to an old deployment)
          sharingType;
      }
    } else if (idHasScope(modId, userScope)) {
      sharingType = "Personal";
    } else if (organization != null) {
      sharingType = "Team";
      label = organization.name;
    } else if (mod.sharing.public) {
      sharingType = "Public";
    } else {
      sharingType = "Unknown";
    }

    label ??= sharingType;

    return {
      type: sharingType,
      label,
      organization,
    };
  };
}
