/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { activateDeployments } from "@/extensionConsole/pages/deployments/activateDeployments";
import useFlags from "@/hooks/useFlags";
import useModPermissions from "@/mods/hooks/useModPermissions";
import notify from "@/utils/notify";
import { useState } from "react";
import { useDispatch } from "react-redux";
import useAsyncEffect from "use-async-effect";
import type { ActivatableDeployment } from "@/types/deploymentTypes";
import type { Nullishable } from "@/utils/nullishUtils";
import { RestrictedFeatures } from "@/auth/featureFlags";
import type { ModInstance } from "@/types/modInstanceTypes";
import { type AsyncDispatch } from "@/extensionConsole/store";

type UseAutoDeployReturn = {
  /**
   * `true` if the deployments are still being loaded or if the deployments are being automatically deployed.
   */
  isAutoDeploying: boolean;
};

function useAutoDeploy({
  activatableDeployments,
  modInstances,
  extensionUpdateRequired,
}: {
  // Expects nullish value if activatableDeployments are uninitialized/not loaded yet
  activatableDeployments: Nullishable<ActivatableDeployment[]>;
  modInstances: ModInstance[];
  extensionUpdateRequired: boolean;
}): UseAutoDeployReturn {
  const dispatch = useDispatch<AsyncDispatch>();
  // `true` until deployments have been fetched and activated
  const [
    isFetchingAndActivatingDeployments,
    setIsFetchingAndActivatingDeployments,
  ] = useState(true);
  // Only `true` while deployments are being activated. Prevents multiple activations from happening at once.
  const [isActivationInProgress, setIsActivationInProgress] = useState(false);
  const { hasPermissions } = useModPermissions(modInstances);
  const { restrict } = useFlags();

  /**
   *  Users who can uninstall (admins and developers) should not have auto-deploy enabled
   *  Deployments will still auto-activate in the background, but won't downgrade the user
   *  so they can work on developing new versions of the mod.
   */
  const shouldAutoDeploy = restrict(RestrictedFeatures.DEACTIVATE_DEPLOYMENT);

  useAsyncEffect(
    async (isMounted) => {
      if (
        !isMounted() ||
        // Still loading deployments or already deploying
        !activatableDeployments ||
        isActivationInProgress
      ) {
        return;
      }

      // No deployments to deploy or user interaction required
      if (
        activatableDeployments.length === 0 ||
        !hasPermissions ||
        extensionUpdateRequired ||
        !shouldAutoDeploy
      ) {
        setIsFetchingAndActivatingDeployments(false);
        return;
      }

      // Attempt to automatically deploy the deployments
      try {
        setIsActivationInProgress(true);
        await dispatch(
          activateDeployments({
            activatableDeployments,
            modInstances,
            reloadMode: "queue",
          }),
        );
        notify.success("Updated team deployments");
      } catch (error) {
        notify.error({ message: "Error updating team deployments", error });
      } finally {
        setIsActivationInProgress(false);
        setIsFetchingAndActivatingDeployments(false);
      }
    },
    [hasPermissions, activatableDeployments],
  );

  return { isAutoDeploying: isFetchingAndActivatingDeployments };
}

export default useAutoDeploy;
