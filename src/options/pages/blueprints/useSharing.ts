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

import { useContext, useMemo } from "react";
import { useGetAuthQuery } from "@/services/api";
import {
  isDeployment,
  isPersonal,
  isPublic,
} from "@/options/pages/blueprints/installableUtils";
import { Installable } from "./blueprintsTypes";

function useSharing(
  installable: Installable
): {
  type: "Personal" | "Public" | "Team" | "Deployment";
  label: string;
} {
  const {
    data: { scope },
  } = useGetAuthQuery();

  const sharingType = useMemo(() => {
    if (isPersonal(installable, scope)) {
      return "Personal";
    }

    if (isDeployment(installable)) {
      return "Deployment";
    }

    if (installable.organization) {
      return "Team";
    }

    if (isPublic(installable)) {
      return "Public";
    }
  }, [installable, scope]);

  return {
    type: sharingType,
    label: ["Team", "Deployment"].includes(sharingType)
      ? installable.organization.name
      : sharingType,
  };
}

export default useSharing;
