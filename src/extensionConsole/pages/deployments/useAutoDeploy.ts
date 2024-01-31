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
import useModPermissions from "@/mods/hooks/useModPermissions";
import { type Deployment } from "@/types/contract";
import { type ModComponentBase } from "@/types/modComponentTypes";
import { checkExtensionUpdateRequired } from "@/utils/deploymentUtils";
import notify from "@/utils/notify";
import { type Dispatch } from "@reduxjs/toolkit";
import { useState } from "react";
import { useDispatch } from "react-redux";
import useAsyncEffect from "use-async-effect";

/**
 * `true` if the deployments are still being loaded or if the deployments are being automatically deployed.
 */
type UseAutoDeployReturn = boolean;

function useAutoDeploy(
  // Deployments can be undefined if they are still being loaded
  deployments: Deployment[] | undefined,
  installedExtensions: ModComponentBase[],
  { extensionUpdateRequired }: { extensionUpdateRequired: boolean },
): UseAutoDeployReturn {
  const dispatch = useDispatch<Dispatch>();
  const [isAutoDeploying, setIsAutoDeploying] = useState(true);
  const [isAttemptingAutoDeploy, setIsAttemptingAutoDeploy] = useState(false);
  const { hasPermissions } = useModPermissions(installedExtensions);

  useAsyncEffect(
    async (isMounted) => {
      // Still loading deployments or already deploying
      if (!isMounted() || !deployments || isAttemptingAutoDeploy) {
        return;
      }

      // No deployments to deploy or user interaction required
      if (
        deployments.length === 0 ||
        !hasPermissions ||
        extensionUpdateRequired
      ) {
        setIsAutoDeploying(false);
        return;
      }

      // Attempt to automatically deploy the deployments
      try {
        setIsAttemptingAutoDeploy(true);
        await activateDeployments(dispatch, deployments, installedExtensions);
        notify.success("Updated team deployments");
      } catch (error) {
        notify.error({ message: "Error updating team deployments", error });
      } finally {
        setIsAttemptingAutoDeploy(false);
        setIsAutoDeploying(false);
      }
    },
    [hasPermissions, deployments],
  );

  return isAutoDeploying;
}

export default useAutoDeploy;
