/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import {
  RegistryId,
  SanitizedServiceConfiguration,
  ServiceDependency,
} from "@/core";
import { castArray, head } from "lodash";
import { locator } from "@/background/locator";
import registry from "@/services/registry";
import { Service } from "@/types";
import { requestPermissions } from "@/utils/permissions";
import { containsPermissions } from "@/background/messenger/api";
import { getErrorMessage } from "@/errors";
import useNotifications from "@/hooks/useNotifications";

type Listener = () => void;

type Dependency = {
  config: SanitizedServiceConfiguration;
  service: Service;
  hasPermissions: boolean;
  requestPermissions: () => void;
};

const permissionsListeners = new Map<string, Listener[]>();

function listenerKey(dependency: ServiceDependency) {
  return `${dependency.id}:${dependency.config}`;
}

function useDependency(serviceId: RegistryId | RegistryId[]): Dependency {
  const notify = useNotifications();
  const { values } = useFormikContext<{ services: ServiceDependency[] }>();
  const [grantedPermissions, setGrantedPermissions] = useState(false);

  const serviceIds = useMemo(() => castArray(serviceId), [serviceId]);

  const dependency: ServiceDependency = useMemo(() => {
    const configuredServices = (values.services ?? []).filter((service) =>
      serviceIds.includes(service.id)
    );
    if (configuredServices.length > 1) {
      throw new Error("Multiple matching services configured");
    }

    return head(configuredServices);
  }, [serviceIds, values.services]);

  const [serviceResult] = useAsyncState(async () => {
    if (dependency?.config) {
      const localConfig = await locator.locate(
        dependency.id,
        dependency.config
      );

      const service = await registry.lookup(dependency.id);

      const origins = service.getOrigins(localConfig.config);

      const hasPermissions = await containsPermissions({ origins });

      return { localConfig, service, origins, hasPermissions };
    }

    throw new Error("No integration selected");
  }, [dependency?.config]);

  useEffect(() => {
    if (dependency != null && !serviceResult?.hasPermissions) {
      const key = listenerKey(dependency);
      const listener = () => {
        setGrantedPermissions(true);
      };

      permissionsListeners.set(key, [
        ...(permissionsListeners.get(key) ?? []),
        listener,
      ]);
      return () => {
        permissionsListeners.set(
          key,
          (permissionsListeners.get(key) ?? []).filter((x) => x !== listener)
        );
      };
    }
  }, [dependency, setGrantedPermissions, serviceResult]);

  const requestPermissionCallback = useCallback(async () => {
    const permissions = { origins: serviceResult?.origins ?? [] };
    console.debug("requesting origins", { permissions });
    try {
      const result = await requestPermissions(permissions);
      setGrantedPermissions(result);
      if (result && dependency != null) {
        const key = listenerKey(dependency);
        for (const listener of permissionsListeners.get(key)) {
          listener();
        }
      } else if (!result) {
        notify.warning("You must accept the permissions request");
      }
    } catch (error) {
      setGrantedPermissions(false);
      notify.error(`Error granting permissions: ${getErrorMessage(error)}`, {
        error,
      });
    }
  }, [notify, setGrantedPermissions, serviceResult?.origins, dependency]);

  return {
    config: serviceResult?.localConfig,
    service: serviceResult?.service,
    hasPermissions: serviceResult?.hasPermissions || grantedPermissions,
    requestPermissions: requestPermissionCallback,
  };
}

export default useDependency;
