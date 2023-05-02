/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { type AuthOption, type AuthSharing } from "@/auth/authTypes";
import { readRawConfigurations } from "@/services/registry";
import { useGetServiceAuthsQuery } from "@/services/api";
import { sortBy } from "lodash";
import { type SanitizedAuth } from "@/types/contract";
import { type RawServiceConfiguration } from "@/types/serviceTypes";
import { type RecipeDefinition } from "@/types/recipeTypes";
import { type RegistryId } from "@/types/registryTypes";
import { getRequiredServiceIds } from "@/utils/recipeUtils";
import useAsyncState from "@/hooks/useAsyncState";
import { type FetchableAsyncState } from "@/types/sliceTypes";
import useMergeAsyncState from "@/hooks/useMergeAsyncState";

function defaultLabel(label: string): string {
  const normalized = (label ?? "").trim();
  return normalized === "" ? "Default" : normalized;
}

export function getSharingType(auth: SanitizedAuth): AuthSharing {
  if (auth.organization?.name) {
    return "shared";
  }

  if (auth.user) {
    return "private";
  }

  return "built-in";
}

const getVisibilityLabel = (auth: SanitizedAuth): string => {
  const sharingType = getSharingType(auth);
  switch (sharingType) {
    case "shared": {
      return auth.organization.name;
    }

    case "private": {
      return "Private";
    }

    default: {
      return "✨ Built-in";
    }
  }
};

function getRemoteLabel(auth: SanitizedAuth): string {
  return `${defaultLabel(auth.label)} — ${getVisibilityLabel(auth)}`;
}

function mapConfigurationsToOptions(
  localServices: RawServiceConfiguration[],
  remoteServices: SanitizedAuth[]
) {
  const localOptions = sortBy(
    localServices.map((serviceConfiguration) => ({
      value: serviceConfiguration.id,
      label: `${defaultLabel(serviceConfiguration.label)} — Private`,
      local: true,
      serviceId: serviceConfiguration.serviceId,
      sharingType: "private" as AuthSharing,
    })),
    (x) => x.label
  );

  const sharedOptions = sortBy(
    remoteServices.map((remoteAuth) => ({
      value: remoteAuth.id,
      label: getRemoteLabel(remoteAuth),
      local: false,
      user: remoteAuth.user,
      serviceId: remoteAuth.service.config.metadata.id,
      sharingType: getSharingType(remoteAuth),
    })),
    (x) => (x.user ? 0 : 1),
    (x) => x.label
  );

  return [...localOptions, ...sharedOptions];
}

/**
 * Return available integration configuration options suitable for display in a react-select dropdown.
 */
export function useAuthOptions(): FetchableAsyncState<AuthOption[]> {
  // Using readRawConfigurations instead of the store for now so that we can refresh the list independent of the
  // redux store. (The option may have been added in a different tab). At some point, we'll need parts of the redux
  // store to reload if it's changed on another tab
  const localServicesState = useAsyncState<RawServiceConfiguration[]>(
    readRawConfigurations,
    []
  );

  const remoteServiceState = useGetServiceAuthsQuery();

  return useMergeAsyncState(
    localServicesState,
    remoteServiceState,
    mapConfigurationsToOptions
  );
}

export function getDefaultAuthOptionsForRecipe(
  recipe: RecipeDefinition,
  authOptions: AuthOption[]
): Record<RegistryId, AuthOption | null> {
  const requiredServiceIds = getRequiredServiceIds(recipe);

  return Object.fromEntries(
    requiredServiceIds.map((serviceId) => {
      const authOptionsForService = authOptions.filter(
        (authOption) => authOption.serviceId === serviceId
      );

      // Prefer arbitrary personal or shared configuration
      const personalOrSharedOption = authOptionsForService.find((authOption) =>
        ["private", "shared"].includes(authOption.sharingType)
      );
      if (personalOrSharedOption) {
        return [serviceId, personalOrSharedOption];
      }

      // Default to built-in option otherwise
      const builtInOption = authOptionsForService.find(
        (authOption) => authOption.sharingType === "built-in"
      );
      if (builtInOption) {
        return [serviceId, builtInOption];
      }

      return [serviceId, null];
    })
  );
}
