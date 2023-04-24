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
import { useAsyncState } from "./common";
import { readRawConfigurations } from "@/services/registry";
import { useMemo, useCallback } from "react";
import { useGetServiceAuthsQuery } from "@/services/api";
import { sortBy } from "lodash";
import { type SanitizedAuth } from "@/types/contract";
import { type RawServiceConfiguration } from "@/types/serviceTypes";
import { type RecipeDefinition } from "@/types/recipeTypes";
import { type RegistryId } from "@/types/registryTypes";
import { getRequiredServiceIds } from "@/utils/recipeUtils";

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

export function useAuthOptions(): {
  authOptions: AuthOption[];
  refresh: () => void;
  isLoading: boolean;
} {
  // Using readRawConfigurations instead of the store for now so that we can refresh the list independent of the
  // redux store. (The option may have been added in a different tab). At some point, we'll need parts of the redux
  // store to reload if it's changed on another tab
  const [configuredServices, isLocalLoading, _localError, refreshLocal] =
    useAsyncState<RawServiceConfiguration[]>(readRawConfigurations);

  const {
    data: remoteAuths,
    isFetching: isRemoteLoading,
    refetch: refreshRemote,
  } = useGetServiceAuthsQuery();

  const authOptions = useMemo(() => {
    const localOptions = sortBy(
      (configuredServices ?? []).map((serviceConfiguration) => ({
        value: serviceConfiguration.id,
        label: `${defaultLabel(serviceConfiguration.label)} — Private`,
        local: true,
        serviceId: serviceConfiguration.serviceId,
        sharingType: "private" as AuthSharing,
      })),
      (x) => x.label
    );

    const sharedOptions = sortBy(
      (remoteAuths ?? []).map((remoteAuth) => ({
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
  }, [remoteAuths, configuredServices]);

  const refresh = useCallback(() => {
    // Locally, eslint run in IntelliJ disagrees with the linter run in CI. There might be a package version mismatch
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- reported as promise on next line
    refreshRemote();
    void refreshLocal();
  }, [refreshRemote, refreshLocal]);

  const isLoading = isLocalLoading || isRemoteLoading;

  return {
    authOptions: isLoading ? [] : authOptions,
    refresh,
    isLoading,
  };
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

/*
 * Get a list of required service ids for a recipe mapped to a default auth option.
 *
 * If there are no options available for the service, the value will be null.
 * Prefer an arbitrary personal or shared auth option over built-in.
 *
 * Assumes that the recipe is not yet installed.
 */
export function useDefaultAuthOptions(recipe: RecipeDefinition): {
  defaultAuthOptions: Record<RegistryId, AuthOption | null>;
  isLoading: boolean;
} {
  const { authOptions, isLoading } = useAuthOptions();

  const defaultAuthOptions = isLoading
    ? {}
    : getDefaultAuthOptionsForRecipe(recipe, authOptions);

  return {
    defaultAuthOptions,
    isLoading,
  };
}
