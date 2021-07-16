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

import React, { useCallback, useMemo, useState } from "react";
import { Deployment } from "@/types/contract";
import { Button } from "react-bootstrap";
import "@/layout/Banner";
import { useDispatch, useSelector } from "react-redux";
import { useToasts } from "react-toast-notifications";
import useAsyncEffect from "use-async-effect";
import {
  checkPermissions,
  collectPermissions,
  ensureAllPermissions,
  originPermissions,
} from "@/permissions";
import cx from "classnames";
import { fromPairs } from "lodash";
import { useAsyncState } from "@/hooks/common";
import { reportEvent } from "@/telemetry/events";
import { optionsSlice } from "@/options/slices";
import axios from "axios";
import { getBaseURL } from "@/services/baseService";
import { getExtensionVersion, getUID } from "@/background/telemetry";
import { getExtensionToken } from "@/auth/token";
import { reportError } from "@/telemetry/logging";
import { activeDeployments, queueReactivate } from "@/background/deployment";
import { selectInstalledExtensions } from "@/options/selectors";

const { actions } = optionsSlice;

function useEnsurePermissions(deployments: Deployment[]) {
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
    } catch (error: unknown) {
      console.error(error);
      reportError(error);
      addToast(`Error granting permissions: ${error}`, {
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
    }
    return true;
  }, [permissions, setEnabled]);

  const groupedPermissions = useMemo(() => {
    return originPermissions(permissions ?? []);
  }, [permissions]);

  return { enabled, request, permissions: groupedPermissions, isPending };
}

function useDeployments() {
  const { addToast } = useToasts();
  const dispatch = useDispatch();
  const installed = useSelector(selectInstalledExtensions);

  const [deployments] = useAsyncState(async () => {
    const token = await getExtensionToken();
    const { data: deployments } = await axios.post<Deployment[]>(
      `${await getBaseURL()}/api/deployments/`,
      {
        uid: await getUID(),
        version: await getExtensionVersion(),
        active: activeDeployments(installed),
      },
      {
        headers: { Authorization: `Token ${token}` },
      }
    );
    return deployments;
  }, [installed]);

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
    // Can't use async here because Firefox loses track of trusted UX event
    request().then((accepted: boolean) => {
      if (accepted) {
        for (const deployment of deployments) {
          // Clear existing installs of the blueprint
          for (const extension of installed) {
            if (
              extension._recipe != null &&
              extension._recipe.id === deployment.package.package_id
            ) {
              dispatch(
                actions.removeExtension({
                  extensionPointId: extension.extensionPointId,
                  extensionId: extension.id,
                })
              );
            }
          }

          // Install the blueprint with the service definition
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
        void queueReactivate();
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

const DeploymentBanner: React.FunctionComponent<{ className?: string }> = ({
  className,
}) => {
  const { hasUpdate, update } = useDeployments();

  if (!hasUpdate) {
    return null;
  }

  return (
    <div
      className={cx("deployment-banner w-100", className)}
      style={{ flex: "none" }}
    >
      <div className="mx-auto d-flex">
        <div className="flex-grow-1" />
        <div className="align-self-center">
          New team bricks are ready to activate
        </div>
        <div className="ml-3">
          <Button className="info" size="sm" onClick={update}>
            Activate
          </Button>
        </div>
        <div className="flex-grow-1" />
      </div>
    </div>
  );
};

export default DeploymentBanner;
