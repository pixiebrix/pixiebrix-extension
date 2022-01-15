/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { UUID } from "@/core";
import { useContext, useMemo } from "react";
import AuthContext from "@/auth/AuthContext";
import { useGetOrganizationsQuery } from "@/services/api";
import {
  getSharing,
  Installable,
  isDeployment,
  isPersonal,
  isPublic,
} from "@/options/pages/blueprints/installableUtils";

function useSharing(
  installable: Installable
): {
  type: "Personal" | "Public" | "Team" | "Deployment";
  label: string;
} {
  const { scope } = useContext(AuthContext);
  const { data: organizations = [] } = useGetOrganizationsQuery();
  const sharing = getSharing(installable);

  // this is the same problem as BrickIcon, in that tens of renders
  // make too many queries
  const organization = useMemo(() => {
    if (!sharing || sharing.organizations.length === 0) {
      return null;
    }

    // If more than one sharing organization, use the first
    return organizations.find((org) =>
      sharing.organizations.includes(org.id as UUID)
    );
  }, [organizations, sharing]);

  const sharingType = useMemo(() => {
    if (isPersonal(installable, scope)) {
      return "Personal";
    }

    if (isDeployment(installable)) {
      return "Deployment";
    }

    if (organization) {
      return "Team";
    }

    if (isPublic(installable)) {
      return "Public";
    }
  }, []);

  return {
    type: sharingType,
    label: ["Team", "Deployment"].includes(sharingType)
      ? organization.name
      : sharingType,
  };
}

export default useSharing;
