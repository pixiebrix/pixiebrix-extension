/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { ResolvedExtensionPointConfig } from "@/types/definitions";
import { ServiceDependency } from "@/core";
import useNotifications from "@/hooks/useNotifications";
import { useFormikContext } from "formik";
import { useAsyncState } from "@/hooks/common";
// eslint-disable-next-line import/no-restricted-paths -- TODO: Should this be executed in the background
import { locator } from "@/background/locator";
import { collectPermissions, ensureAllPermissions } from "@/permissions";
import { resolveDefinitions } from "@/registry/internal";
import { containsPermissions } from "@/background/messenger/api";
import { useCallback } from "react";
import { getErrorMessage } from "@/errors";
import { reportEvent } from "@/telemetry/events";
import { CloudExtension } from "@/types/contract";

function useEnsurePermissions(
  extension: CloudExtension,
  services: ServiceDependency[]
) {
  const notify = useNotifications();
  const { submitForm } = useFormikContext();

  const [permissionState, isPending, error] = useAsyncState(async () => {
    await locator.refreshLocal();
    const resolved = await resolveDefinitions({ ...extension, services });

    const configured = services.filter((x) => x.config);

    const permissions = await collectPermissions(
      [resolved].map(
        (extension) =>
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- inline nominal typing
          ({
            id: extension.extensionPointId,
            config: extension.config,
            services: Object.fromEntries(
              services.map((service) => [service.outputKey, service.id])
            ),
          } as ResolvedExtensionPointConfig)
      ),
      configured.map(({ id, config }) => ({ id, config }))
    );
    const enabled = await containsPermissions(permissions);
    return {
      enabled,
      permissions,
    };
  }, [extension, services]);

  const { enabled, permissions } = permissionState ?? {
    enabled: false,
    permissions: null,
  };

  const request = useCallback(async () => {
    let accepted = false;

    try {
      accepted = await ensureAllPermissions(permissions);
    } catch (error) {
      notify.error(`Error granting permissions: ${getErrorMessage(error)}`, {
        error,
      });
      return false;
    }

    if (!accepted) {
      // Event is tracked in `activate` callback
      notify.warning("You declined the permissions");
      return false;
    }

    return true;
  }, [permissions, notify]);

  const activate = useCallback(() => {
    // Can't use async here because Firefox loses track of trusted UX event
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    void request().then((accepted: boolean) => {
      if (accepted) {
        // The event gets reported in the reducer
        return submitForm();
      }

      reportEvent("CloudExtensionRejectPermissions", {
        extensionId: extension.id,
      });
    });
  }, [request, submitForm, extension]);

  return {
    enabled,
    request,
    permissions,
    activate,
    isPending,
    error,
  };
}

export default useEnsurePermissions;
