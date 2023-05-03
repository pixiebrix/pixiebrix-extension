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
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormikContext } from "formik";
import { castArray, compact, head } from "lodash";
import serviceRegistry from "@/services/registry";
import {
  type SanitizedServiceConfiguration,
  type Service,
  type ServiceDependency,
} from "@/types/serviceTypes";
import { containsPermissions, services } from "@/background/messenger/api";
import notify from "@/utils/notify";
import { type RegistryId } from "@/types/registryTypes";
import { ensureAllPermissionsFromUserGesture } from "@/permissions/permissionsUtils";

type Listener = () => void;

export type Dependency = {
  config: SanitizedServiceConfiguration;
  service: Service;
  hasPermissions: boolean;
  requestPermissions: () => void;
};

const permissionsListeners = new Map<string, Listener[]>();

function listenerKey(dependency: ServiceDependency) {
  return `${dependency.id}:${dependency.config}`;
}

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

export async function lookupDependency(dependency: ServiceDependency) {
  const localConfig = await services.locate(dependency.id, dependency.config);

  const service = await serviceRegistry.lookup(dependency.id);

  const origins = service.getOrigins(localConfig.config);

  const hasPermissions = await containsPermissions({ origins });

  return { localConfig, service, origins, hasPermissions };
}

/**
 * Hook connected to the Formik state to return currently configuration for a given service
 * @param serviceId valid integration ids for providing the service
 */
function useDependency(
  serviceId: RegistryId | RegistryId[] | null
): Dependency | null {
  const { values } = useFormikContext<{ services: ServiceDependency[] }>();
  const [grantedPermissions, setGrantedPermissions] = useState(false);

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
  }, [dependency?.config]);

  // Listen for permissions changes granted from hook instances, so the useDependency can be used in multiple
  // places in the React tree
  useEffect(() => {
    if (dependency && !serviceResult?.hasPermissions) {
      const key = listenerKey(dependency);
      const onPermissionGranted = () => {
        setGrantedPermissions(true);
      };

      permissionsListeners.set(key, [
        ...(permissionsListeners.get(key) ?? []),
        onPermissionGranted,
      ]);
      return () => {
        permissionsListeners.set(
          key,
          (permissionsListeners.get(key) ?? []).filter(
            (x) => x !== onPermissionGranted
          )
        );
      };
    }
  }, [dependency, setGrantedPermissions, serviceResult]);

  const requestPermissionCallback = useCallback(async () => {
    const permissions = { origins: serviceResult?.origins ?? [] };
    console.debug("requesting origins", { permissions });
    try {
      const accepted = await ensureAllPermissionsFromUserGesture(permissions);
      setGrantedPermissions(accepted);
      if (accepted && dependency != null) {
        const key = listenerKey(dependency);
        for (const listener of permissionsListeners.get(key)) {
          listener();
        }
      } else if (!accepted) {
        notify.warning("You must accept the permissions request");
      }
    } catch (error) {
      setGrantedPermissions(false);
      notify.error({
        message: "Error granting permissions",
        error,
      });
    }
  }, [setGrantedPermissions, serviceResult?.origins, dependency]);

  // Wrap in use memo so callers don't have to do their own guards
  return useMemo(() => {
    if (serviceId == null) {
      return null;
    }

    return {
      config: serviceResult?.localConfig,
      service: serviceResult?.service,
      hasPermissions: serviceResult?.hasPermissions || grantedPermissions,
      requestPermissions: requestPermissionCallback,
    };
  }, [
    grantedPermissions,
    requestPermissionCallback,
    serviceId,
    serviceResult?.hasPermissions,
    serviceResult?.localConfig,
    serviceResult?.service,
  ]);
}

export default useDependency;
