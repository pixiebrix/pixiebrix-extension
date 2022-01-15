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

import { ResolvedExtension, UUID } from "@/core";
import { useContext, useMemo } from "react";
import AuthContext from "@/auth/AuthContext";
import { RecipeDefinition } from "@/types/definitions";
import { useGetOrganizationsQuery } from "@/services/api";
import { Installable } from "@/options/pages/blueprints/useInstallables";

const isPublic = (extension: ResolvedExtension) =>
  extension._recipe?.sharing?.public;

const hasOrganization = (extension: ResolvedExtension) =>
  extension._recipe?.sharing?.organizations.length > 0;

const isPersonalBrick = (extension: ResolvedExtension) =>
  !extension._recipe && !extension._deployment;

const isPersonalBlueprint = (extension: ResolvedExtension, scope: string) =>
  scope && extension._recipe?.id.startsWith(scope + "/");

const isExtension = (blueprint: Installable): blueprint is ResolvedExtension =>
  "_recipe" in blueprint;

function useSharing(blueprint: ResolvedExtension | RecipeDefinition) {
  const { scope } = useContext(AuthContext);
  const { data: organizations = [] } = useGetOrganizationsQuery();
  const sharing = isExtension(blueprint)
    ? blueprint._recipe?.sharing
    : blueprint.sharing;

  const organization = useMemo(() => {
    if (sharing.organizations.length === 0) {
      return null;
    }

    // If more than one sharing organization, use the first
    return organizations.find((org) =>
      sharing.organizations.includes(org.id as UUID)
    );
  }, [organizations, sharing.organizations]);
}

export default useSharing;
