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

import { type AuthOption } from "@/auth/authTypes";
import { useAsyncState } from "./common";
import { readRawConfigurations } from "@/services/registry";
import { useMemo, useCallback } from "react";
import { useGetServiceAuthsQuery } from "@/services/api";
import { sortBy } from "lodash";
import { type SanitizedAuth } from "@/types/contract";
import { type RawServiceConfiguration } from "@/types/serviceTypes";
import { type RecipeDefinition } from "@/types/recipeTypes";
import { type RegistryId } from "@/types/registryTypes";
import { type UUID } from "@/types/stringTypes";
import { getRequiredServiceIds } from "@/utils/recipeUtils";

function defaultLabel(label: string): string {
  const normalized = (label ?? "").trim();
  return normalized === "" ? "Default" : normalized;
}

type AuthSharing = "private" | "shared" | "built-in";

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

export function useDefaultAuthsByRequiredServiceIds(
  recipe: RecipeDefinition | null
): {
  builtInServiceAuths: Record<RegistryId, UUID | undefined>;
  isLoading: boolean;
} {
  const { data: serviceAuths, isLoading } = useGetServiceAuthsQuery();

  const builtInAuths = (serviceAuths ?? []).filter(
    (auth) => getSharingType(auth) === "built-in"
  );
  const personalOrSharedAuths = (serviceAuths ?? []).filter(
    (auth) => getSharingType(auth) !== "built-in"
  );

  const requiredServiceIds = recipe ? getRequiredServiceIds(recipe) : [];

  const defaultServiceAuths = Object.fromEntries(
    requiredServiceIds.map((serviceId) => {
      const personalOrSharedAuth = personalOrSharedAuths.find(
        (auth) => auth.service.config.metadata.id === serviceId
      );

      // Prefer arbitrary personal or shared auth over built-in auth
      if (personalOrSharedAuth) {
        return [serviceId, personalOrSharedAuth.id];
      }

      const builtInAuth = builtInAuths.find(
        (auth) => auth.service.config.metadata.id === serviceId
      );

      return [serviceId, builtInAuth?.id];
    })
  );

  return {
    isLoading,
    builtInServiceAuths: defaultServiceAuths,
  };
}

export function useAuthOptions(): [AuthOption[], () => void] {
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
    if (isLocalLoading || isRemoteLoading) {
      // Return no options to avoid unwanted default behavior when the local options are loaded but the remote options
      // are still pending
      return [];
    }

    const localOptions = sortBy(
      (configuredServices ?? []).map((x) => ({
        value: x.id,
        label: `${defaultLabel(x.label)} — Private`,
        local: true,
        serviceId: x.serviceId,
      })),
      (x) => x.label
    );

    const sharedOptions = sortBy(
      (remoteAuths ?? []).map((x) => ({
        value: x.id,
        label: getRemoteLabel(x),
        local: false,
        user: x.user,
        serviceId: x.service.config.metadata.id,
      })),
      (x) => (x.user ? 0 : 1),
      (x) => x.label
    );

    return [...localOptions, ...sharedOptions];
  }, [isLocalLoading, isRemoteLoading, remoteAuths, configuredServices]);

  const refresh = useCallback(() => {
    // Locally, eslint run in IntelliJ disagrees with the linter run in CI. There might be a package version mismatch
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- reported as promise on next line
    refreshRemote();
    void refreshLocal();
  }, [refreshRemote, refreshLocal]);

  return [authOptions, refresh];
}
