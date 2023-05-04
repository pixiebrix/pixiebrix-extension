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

import { useAsyncState } from "@/hooks/common";
import { useMemo } from "react";
import { useFormikContext } from "formik";
import { castArray, compact, head } from "lodash";
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

export type Dependency = {
  config: SanitizedServiceConfiguration;
  service: Service;
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
    localConfig,
    service,
    origins,
    permissions,
    hasPermissions: await containsPermissions(permissions),
  };
}

/**
 * Hook connected to the Formik state to return currently configuration for a given service
 * @param serviceId valid integration ids for providing the service
 */
function useDependency(
  serviceId: RegistryId | RegistryId[] | null
): Dependency | null {
  const { values } = useFormikContext<{ services: ServiceDependency[] }>();

  // Listen for permissions changes
  const permissionsState = useExtensionPermissions();

  const serviceIds = useMemo(() => compact(castArray(serviceId)), [serviceId]);
  const dependency: ServiceDependency = useMemo(
    () => pickDependency(values.services, serviceIds),
    [serviceIds, values.services]
  );

  const [serviceResult] = useAsyncState(async () => {
    if (dependency?.config) {
      return lookupDependency(dependency);
    }

    throw new Error("No integration dependency selected");
  }, [dependency?.config, permissionsState?.data]);

  const requestPermissionCallback = useRequestPermissionsCallback(
    serviceResult?.permissions
  );

  // Wrap in use memo so callers don't have to do their own guards
  return useMemo(() => {
    if (serviceId == null) {
      return null;
    }

    return {
      config: serviceResult?.localConfig,
      service: serviceResult?.service,
      hasPermissions: serviceResult?.hasPermissions,
      requestPermissions: requestPermissionCallback,
    };
  }, [
    requestPermissionCallback,
    serviceId,
    serviceResult?.hasPermissions,
    serviceResult?.localConfig,
    serviceResult?.service,
  ]);
}

export default useDependency;
