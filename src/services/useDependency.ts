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

import { useFormikContext } from "formik";
import { castArray, compact, head, omit } from "lodash";
import serviceRegistry from "@/services/registry";
import {
  type SanitizedServiceConfiguration,
  type Service,
  type ServiceDependency,
} from "@/types/serviceTypes";
import { containsPermissions, services } from "@/background/messenger/api";
import { type RegistryId } from "@/types/registryTypes";
import useExtensionPermissions from "@/permissions/useExtensionPermissions";
import useRequestPermissionsCallback from "@/permissions/useRequestPermissionsCallback";
import useDeriveAsyncState from "@/hooks/useDeriveAsyncState";
import { fallbackValue, valueToAsyncState } from "@/utils/asyncStateUtils";
import useMemoCompare from "@/hooks/useMemoCompare";
import deepEquals from "fast-deep-equal";
import { emptyPermissionsFactory } from "@/permissions/permissionsUtils";
import { type Permissions } from "webextension-polyfill";

export type Dependency = {
  config: SanitizedServiceConfiguration | undefined;
  service: Service | undefined;
  hasPermissions: boolean;
  requestPermissions: () => void;
};

export function pickDependency(
  services: ServiceDependency[],
  serviceIds: RegistryId[]
): ServiceDependency | null {
  const configuredServices = (services ?? []).filter((service) =>
    serviceIds.includes(service.id)
  );
  if (configuredServices.length > 1) {
    throw new Error("Multiple matching services configured");
  }

  return head(configuredServices);
}

async function lookupDependency(dependency: ServiceDependency) {
  const localConfig = await services.locate(dependency.id, dependency.config);
  const service = await serviceRegistry.lookup(dependency.id);
  const origins = service.getOrigins(localConfig.config);
  const permissions = { origins };

  return {
    config: localConfig,
    service,
    origins,
    permissions,
    hasPermissions: await containsPermissions(permissions),
  };
}

const lookupFallback = {
  config: undefined as SanitizedServiceConfiguration,
  service: undefined as Service,
  hasPermissions: false,
  permissions: emptyPermissionsFactory() as Permissions.Permissions,
};

/**
 * Hook connected to the Formik state to return currently configuration for a given service
 * @param serviceId valid integration ids for providing the service
 */
function useDependency(serviceId: RegistryId | RegistryId[]): Dependency {
  // Listen for permissions changes
  const permissionsState = useExtensionPermissions();
  const { values } = useFormikContext<{ services: ServiceDependency[] }>();

  const selected = pickDependency(
    values.services,
    compact(castArray(serviceId))
  );

  const { data } = fallbackValue(
    useDeriveAsyncState(
      permissionsState,
      valueToAsyncState(selected),
      async (_permissions, dependency: ServiceDependency) => {
        if (dependency?.config) {
          return lookupDependency(dependency);
        }

        // No integration dependency selected, use the fallback
        throw new Error("No dependency selected");
      }
    ),
    lookupFallback
  );

  const requestPermissions = useRequestPermissionsCallback(data.permissions);

  // Wrap in use memo so callers don't have to do their own guards
  return useMemoCompare(
    {
      ...omit(data, "permissions", "origins"),
      requestPermissions,
    },
    deepEquals
  );
}

export default useDependency;
