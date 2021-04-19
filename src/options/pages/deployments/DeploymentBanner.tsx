import React, { useCallback, useMemo, useState } from "react";
import { useFetch } from "@/hooks/fetch";
import { Deployment } from "@/types/contract";
import { Button } from "react-bootstrap";
import { fromPairs } from "lodash";
import "@/layout/Banner";
import { useDispatch, useSelector } from "react-redux";
import { selectExtensions } from "@/options/pages/InstalledPage";
import moment from "moment";
import { useToasts } from "react-toast-notifications";
import useAsyncEffect from "use-async-effect";
import {
  checkPermissions,
  collectPermissions,
  ensureAllPermissions,
  originPermissions,
} from "@/permissions";
import { useAsyncState } from "@/hooks/common";
import { reportEvent } from "@/telemetry/events";

import { optionsSlice } from "@/options/slices";

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
    return await collectPermissions(
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

function useDeployments() {
  const { addToast } = useToasts();
  const deployments = useFetch<Deployment[]>("/api/deployments/");
  const dispatch = useDispatch();
  const installed = useSelector(selectExtensions);

  console.log("deployments", { deployments, installed });

  const updated = useMemo(() => {
    return (deployments ?? []).filter((deployment) => {
      const match = installed.find(
        (extension) => extension._deployment?.id === deployment.id
      );
      return (
        !match ||
        moment(match._deployment.timestamp).isBefore(
          moment(deployment.updated_at)
        )
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

const DeploymentBanner: React.FunctionComponent = () => {
  const { hasUpdate, update } = useDeployments();

  if (!hasUpdate) {
    return null;
  }

  return (
    <div className="deployment-banner w-100">
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
