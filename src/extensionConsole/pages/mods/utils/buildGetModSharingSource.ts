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

export default function buildGetModSharingSource(
  userScope: string,
  organizations: AuthUserOrganization[],
  activatedModComponents: ActivatedModComponent[],
): (mod: Mod) => SharingSource {
  return (mod: Mod) => {
    let sharingType: SharingType | null = null;
    const organization = organizations.find(
      (org) => org.id && mod.sharing.organizations.includes(org.id),
    );
    let label: string;
    const modId = mod.metadata.id;

    switch (true) {
      case idHasScope(modId, userScope): {
        sharingType = "Personal";
        break;
      }

      case activatedModComponents.some(
        ({ _recipe, _deployment }) => _recipe?.id === modId && _deployment,
      ): {
        sharingType = "Deployment";
        // There's a corner case for team deployments of marketplace bricks. The organization will come through as
        // nullish here.
        if (organization?.name) {
          label = organization.name;
        }

        break;
      }

      case organization != null: {
        sharingType = "Team";
        label = organization.name;
        break;
      }

      case mod.sharing.public: {
        sharingType = "Public";
        break;
      }

      default: {
        sharingType = "Unknown";
      }
    }

    label ??= sharingType;

    return {
      type: sharingType,
      label,
      organization,
    };
  };
}
