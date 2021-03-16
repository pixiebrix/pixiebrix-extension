import { useAsyncState } from "@/hooks/common";
import { checkPermissions } from "@/permissions";
import { useCallback, useEffect, useMemo, useState } from "react";
import { browser } from "webextension-polyfill-ts";
import { reportError } from "@/telemetry/logging";
import { useToasts } from "react-toast-notifications";
import { useFormikContext } from "formik";
import { SanitizedServiceConfiguration, ServiceDependency } from "@/core";
import { head } from "lodash";
import { locator } from "@/background/locator";
import registry from "@/services/registry";
import { Service } from "@/types";

type Listener = () => void;

const permissionsListeners = new Map<string, Listener[]>();

export function useDependency(
  serviceId: string
): {
  config: SanitizedServiceConfiguration;
  service: Service;
  hasPermissions: boolean;
  requestPermissions: () => void;
} {
  const { addToast } = useToasts();
  const { values } = useFormikContext<{ services: ServiceDependency[] }>();
  const [grantedPermissions, setGrantedPermissions] = useState<boolean>(false);

  const dependency: ServiceDependency = useMemo(() => {
    const service = (values.services ?? []).filter(
      (service) => service.id === serviceId
    );
    if (service.length > 1) {
      // FIXME: this could use the selected service for the block to avoid multiple results
      throw new Error(`Multiple services configured for ${serviceId}`);
    }
    return head(service);
  }, [values.services]);

  const [serviceResult] = useAsyncState(async () => {
    if (dependency.config) {
      const localConfig = await locator.locate(serviceId, dependency.config);
      const service = await registry.lookup(dependency.id);
      return { localConfig: localConfig, service };
    } else {
      throw Error("No integration selected");
    }
  }, [dependency?.config]);

  const origins = useMemo(() => {
    return serviceResult?.service
      ? serviceResult.service.getOrigins(serviceResult.localConfig.config)
      : null;
  }, [serviceResult?.service]);

  const [hasPermissions] = useAsyncState(async () => {
    if (origins != null) {
      return await checkPermissions([{ origins }]);
    } else {
      return false;
    }
  }, [origins]);

  useEffect(() => {
    if (dependency?.config && !hasPermissions) {
      const key = `${serviceId}:${dependency.config}`;
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
  }, [serviceId, dependency?.config, setGrantedPermissions, hasPermissions]);

  const requestPermissions = useCallback(async () => {
    const permissions = { origins };
    console.debug("requesting origins", { permissions });
    browser.permissions
      .request(permissions)
      .then((result) => {
        setGrantedPermissions(result);
        if (!result) {
          addToast("You must accept the permissions request", {
            appearance: "warning",
            autoDismiss: true,
          });
        } else {
          const key = `${serviceId}:${dependency.config}`;
          for (const listener of permissionsListeners.get(key)) {
            listener();
          }
        }
      })
      .catch((err) => {
        setGrantedPermissions(false);
        reportError(err);
        addToast(`Error granting permissions: ${err.toString()}`, {
          appearance: "error",
          autoDismiss: true,
        });
      });
  }, [
    serviceResult,
    addToast,
    setGrantedPermissions,
    origins,
    serviceId,
    dependency?.config,
  ]);

  return {
    config: serviceResult?.localConfig,
    service: serviceResult?.service,
    hasPermissions: hasPermissions || grantedPermissions,
    requestPermissions,
  };
}
