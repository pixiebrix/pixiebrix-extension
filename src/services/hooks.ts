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
import { checkPermissions } from "@/permissions";
import { useCallback, useEffect, useMemo, useState } from "react";
import { reportError } from "@/telemetry/logging";
import { useToasts } from "react-toast-notifications";
import { useFormikContext } from "formik";
import { SanitizedServiceConfiguration, ServiceDependency } from "@/core";
import { head, castArray } from "lodash";
import { locator } from "@/background/locator";
import registry from "@/services/registry";
import { Service } from "@/types";
import { requestPermissions } from "@/utils/permissions";

type Listener = () => void;

const permissionsListeners = new Map<string, Listener[]>();

export function useDependency(
  serviceId: string | string[]
): {
  config: SanitizedServiceConfiguration;
  service: Service;
  hasPermissions: boolean;
  requestPermissions: () => void;
} {
  const { addToast } = useToasts();
  const { values } = useFormikContext<{ services: ServiceDependency[] }>();
  const [grantedPermissions, setGrantedPermissions] = useState<boolean>(false);

  const serviceIds = castArray(serviceId);

  const dependency: ServiceDependency = useMemo(() => {
    const configuredServices = (values.services ?? []).filter((service) =>
      serviceIds.includes(service.id)
    );
    if (configuredServices.length > 1) {
      throw new Error("Multiple matching services configured");
    }
    return head(configuredServices);
  }, [values.services]);

  const [serviceResult] = useAsyncState(async () => {
    if (dependency.config) {
      const localConfig = await locator.locate(
        dependency.id,
        dependency.config
      );
      const service = await registry.lookup(dependency.id);
      return { localConfig: localConfig, service };
    }
    throw new Error("No integration selected");
  }, [dependency?.config]);

  const origins = useMemo(() => {
    return serviceResult?.service
      ? serviceResult.service.getOrigins(serviceResult.localConfig.config)
      : null;
  }, [serviceResult?.service]);

  const [hasPermissions] = useAsyncState(async () => {
    if (origins != null) {
      return checkPermissions([{ origins }]);
    }
    return false;
  }, [origins]);

  useEffect(() => {
    if (dependency?.config && !hasPermissions) {
      const key = `${dependency.id}:${dependency.config}`;
      const listener = () => setGrantedPermissions(true);
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
  }, [
    dependency?.id,
    dependency?.config,
    setGrantedPermissions,
    hasPermissions,
  ]);

  const requestPermissionCallback = useCallback(async () => {
    const permissions = { origins };
    console.debug("requesting origins", { permissions });
    try {
      const result = await requestPermissions(permissions);
      setGrantedPermissions(result);
      if (!result) {
        addToast("You must accept the permissions request", {
          appearance: "warning",
          autoDismiss: true,
        });
      } else {
        const key = `${dependency.id}:${dependency.config}`;
        for (const listener of permissionsListeners.get(key)) {
          listener();
        }
      }
    } catch (error: unknown) {
      setGrantedPermissions(false);
      reportError(error);
      addToast(`Error granting permissions: ${error.toString()}`, {
        appearance: "error",
        autoDismiss: true,
      });
    }
  }, [
    serviceResult,
    addToast,
    setGrantedPermissions,
    origins,
    dependency?.id,
    dependency?.config,
  ]);

  return {
    config: serviceResult?.localConfig,
    service: serviceResult?.service,
    hasPermissions: hasPermissions || grantedPermissions,
    requestPermissions: requestPermissionCallback,
  };
}
