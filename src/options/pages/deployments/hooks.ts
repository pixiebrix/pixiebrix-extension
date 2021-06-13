/*
 * Copyright (C) 2021 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Deployment } from "@/types/contract";
import { useToasts } from "react-toast-notifications";
import { useCallback, useMemo, useState } from "react";
import { useAsyncState } from "@/hooks/common";
import {
  checkPermissions,
  collectPermissions,
  ensureAllPermissions,
  originPermissions,
} from "@/permissions";
import useAsyncEffect from "use-async-effect";
import { useFetch } from "@/hooks/fetch";
import { useDispatch, useSelector } from "react-redux";
import { selectExtensions } from "@/options/pages/InstalledPage";
import { fromPairs } from "lodash";
import { reportEvent } from "@/telemetry/events";
import { optionsSlice } from "@/options/slices";

import { reportError } from "@/telemetry/logging";

const { actions } = optionsSlice;

export function useEnsurePermissions(deployments: Deployment[]) {
  const { addToast } = useToasts();
  const [enabled, setEnabled] = useState<boolean>(undefined);

  const blueprints = useMemo(() => {
    return deployments.map((x) => x.package.config);
  }, [deployments]);

  const [permissions, isPending] = useAsyncState(async () => {
    // Deployments can only use proxied services, so there's no additional permissions to request for the
    // the serviceAuths.
    return collectPermissions(
      blueprints.flatMap((x) => x.extensionPoints),
      []
    );
  }, [blueprints]);

  useAsyncEffect(
    async (isMounted) => {
      if (permissions) {
        const enabled = await checkPermissions(permissions);
        if (!isMounted()) return;
        setEnabled(enabled);
      }
    },
    [permissions, setEnabled]
  );

  const request = useCallback(async () => {
    let accepted = false;

    try {
      accepted = await ensureAllPermissions(permissions);
    } catch (err) {
      console.error(err);
      reportError(err);
      addToast(`Error granting permissions: ${err}`, {
        appearance: "error",
        autoDismiss: true,
      });
      return false;
    }

    if (!accepted) {
      addToast(`You declined the permissions`, {
        appearance: "error",
        autoDismiss: true,
      });
      return false;
    } else {
      return true;
    }
  }, [permissions, setEnabled]);

  const groupedPermissions = useMemo(() => {
    return originPermissions(permissions ?? []);
  }, [permissions]);

  return { enabled, request, permissions: groupedPermissions, isPending };
}

export function useDeployments() {
  const { addToast } = useToasts();
  const deployments = useFetch<Deployment[]>("/api/deployments/");
  const dispatch = useDispatch();
  const installed = useSelector(selectExtensions);

  const updated = useMemo(() => {
    return (deployments ?? []).filter((deployment) => {
      const match = installed.find(
        (extension) => extension._deployment?.id === deployment.id
      );
      return (
        !match ||
        new Date(match._deployment.timestamp) < new Date(deployment.updated_at)
      );
    });
  }, [installed, deployments]);

  const { request } = useEnsurePermissions(updated);

  const update = useCallback(() => {
    // can't use async here because Firefox loses track of trusted UX event
    request().then((accepted: boolean) => {
      if (accepted) {
        for (const deployment of deployments) {
          // clear existing installs of the blueprint
          for (const extension of installed) {
            if (extension._recipe.id === deployment.package.package_id) {
              dispatch(
                actions.removeExtension({
                  extensionPointId: extension.extensionPointId,
                  extensionId: extension.id,
                })
              );
            }
          }

          // install the blueprint with the service definition
          dispatch(
            actions.installRecipe({
              recipe: deployment.package.config,
              extensionPoints: deployment.package.config.extensionPoints,
              services: fromPairs(
                deployment.bindings.map((x) => [x.auth.service_id, x.auth.id])
              ),
              deployment,
            })
          );
          reportEvent("DeploymentActivate", {
            deployment: deployment.id,
          });
        }
        addToast("Activated team bricks", {
          appearance: "success",
          autoDismiss: true,
        });
      } else {
        reportEvent("DeploymentRejectPermissions", {});
      }
    });
  }, [request, updated, addToast, installed]);

  return { hasUpdate: updated?.length > 0, update };
}
