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

import { type AuthOption, type AuthSharing } from "@/auth/authTypes";
import { sortBy } from "lodash";
import { type RemoteIntegrationConfig } from "@/types/contract";
import { type IntegrationConfig } from "@/integrations/integrationTypes";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { type RegistryId } from "@/types/registryTypes";
import useAsyncState from "@/hooks/useAsyncState";
import { type FetchableAsyncState } from "@/types/sliceTypes";
import useMergeAsyncState from "@/hooks/useMergeAsyncState";
import { useGetIntegrationAuthsQuery } from "@/data/service/api";
import getModDefinitionIntegrationIds from "@/integrations/util/getModDefinitionIntegrationIds";
import { type Nullishable } from "@/utils/nullishUtils";
import { readRawConfigurations } from "@/integrations/util/readRawConfigurations";

function defaultLabel(label: Nullishable<string>): string {
  const normalized = (label ?? "").trim();
  return normalized === "" ? "Default" : normalized;
}

export function getSharingType(auth: RemoteIntegrationConfig): AuthSharing {
  if (auth.organization?.name) {
    return "shared";
  }

  if (auth.user) {
    return "private";
  }

  return "built-in";
}

const getVisibilityLabel = (auth: RemoteIntegrationConfig): string => {
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

function getRemoteLabel(auth: RemoteIntegrationConfig): string {
  return `${defaultLabel(auth.label)} — ${getVisibilityLabel(auth)}`;
}

function mapConfigurationsToOptions(
  locationIntegrationConfigs: IntegrationConfig[],
  remoteIntegrationConfigs: RemoteIntegrationConfig[],
) {
  const localOptions = sortBy(
    locationIntegrationConfigs.map((integrationConfig) => ({
      value: integrationConfig.id,
      label: `${defaultLabel(integrationConfig.label)} — Private`,
      local: true,
      serviceId: integrationConfig.integrationId,
      sharingType: "private" as AuthSharing,
    })),
    (x) => x.label,
  );

  const sharedOptions = sortBy(
    remoteIntegrationConfigs.map((remoteAuth) => ({
      value: remoteAuth.id,
      label: getRemoteLabel(remoteAuth),
      local: false,
      user: remoteAuth.user,
      serviceId: remoteAuth.service.config.metadata.id,
      sharingType: getSharingType(remoteAuth),
    })),
    (x) => (x.user ? 0 : 1),
    (x) => x.label,
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
  const locationIntegrationConfigsState = useAsyncState<IntegrationConfig[]>(
    readRawConfigurations,
    [],
  );

  const remoteIntegrationAuthsState = useGetIntegrationAuthsQuery();

  return useMergeAsyncState(
    locationIntegrationConfigsState,
    remoteIntegrationAuthsState,
    mapConfigurationsToOptions,
  );
}

export function getDefaultAuthOptionsForMod(
  modDefinition: ModDefinition,
  authOptions: AuthOption[],
): Record<RegistryId, AuthOption | null> {
  const requiredIntegrationIds = getModDefinitionIntegrationIds(modDefinition, {
    // The PixieBrix service gets automatically configured, so no need to include it
    excludePixieBrix: true,
  });

  return Object.fromEntries(
    requiredIntegrationIds.map((integrationId) => {
      const authOptionsForIntegration = authOptions.filter(
        (authOption) => authOption.serviceId === integrationId,
      );

      // Prefer arbitrary personal or shared configuration
      const personalOrSharedOption = authOptionsForIntegration.find(
        (authOption) => ["private", "shared"].includes(authOption.sharingType),
      );
      if (personalOrSharedOption) {
        return [integrationId, personalOrSharedOption];
      }

      // Default to built-in option otherwise
      const builtInOption = authOptionsForIntegration.find(
        (authOption) => authOption.sharingType === "built-in",
      );
      if (builtInOption) {
        return [integrationId, builtInOption];
      }

      return [integrationId, null];
    }),
  );
}
