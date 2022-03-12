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

import { useGetOrganizationsQuery, useGetRecipesQuery } from "@/services/api";
import useFlags from "@/hooks/useFlags";
import { useMemo } from "react";
import useDeployments from "@/hooks/useDeployments";

export type OnboardingType =
  | "default"
  | "hasDeployments"
  | "restricted"
  | "hasTeamBlueprints";

function useOnboarding(): {
  onboardingType: OnboardingType;
  isLoading: boolean;
} {
  const { restrict } = useFlags();

  const { data: rawRecipes, isLoading: isRecipesLoading } =
    useGetRecipesQuery();
  const { data: organizations, isLoading: isOrganizationsLoading } =
    useGetOrganizationsQuery();
  const { hasUpdate: hasDeployments, isLoading: isDeploymentsLoading } =
    useDeployments();

  const teamRecipes = (rawRecipes ?? []).filter(
    (recipe) => recipe.sharing.organizations.length > 0
  );

  const hasTeamBlueprints = teamRecipes?.length > 0;
  const hasOrganization = organizations?.length > 0;

  const onboardingType = useMemo(() => {
    if (hasOrganization) {
      if (hasDeployments) {
        return "hasDeployments";
      }

      if (restrict("marketplace")) {
        return "restricted";
      }

      if (hasTeamBlueprints) {
        return "hasTeamBlueprints";
      }
    }

    return "default";
  }, [hasDeployments, hasOrganization, hasTeamBlueprints, restrict]);

  return {
    onboardingType,
    isLoading:
      isOrganizationsLoading || isDeploymentsLoading || isRecipesLoading,
  };
}

export default useOnboarding;
