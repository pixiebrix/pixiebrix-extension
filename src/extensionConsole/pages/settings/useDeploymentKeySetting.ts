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

import { useConfiguredDeploymentKey } from "@/auth/deploymentKey";
import useUserAction from "@/hooks/useUserAction";
import { type DeploymentKey } from "@/auth/authTypes";
import { isNullOrBlank } from "@/utils/stringUtils";
import { CancelError } from "@/errors/businessErrors";

const deploymentKeyRegex = /^[\dA-Za-z]{32,128}$/;

/**
 * Hook to update the user-configured deployment key setting.
 * @since 2.0.6
 */
function useDeploymentKeySetting(): [
  DeploymentKey | undefined,
  (deploymentKey: string) => Promise<void>,
] {
  const [deploymentKey, setDeploymentKey] = useConfiguredDeploymentKey();

  const update = useUserAction(
    async (value: string) => {
      // XXX: future improvement, check that deployment key is valid?
      const nextDeploymentKey = isNullOrBlank(value)
        ? undefined
        : (value as DeploymentKey);

      if (
        (deploymentKey == null && nextDeploymentKey == null) ||
        nextDeploymentKey === deploymentKey
      ) {
        // Throwing CancelError prevents success/error message from showing
        throw new CancelError("No deployment key change provided");
      }

      if (
        nextDeploymentKey != null &&
        !deploymentKeyRegex.test(nextDeploymentKey)
      ) {
        throw new Error("Invalid deployment key format provided");
      }

      await setDeploymentKey(nextDeploymentKey);
    },
    {
      successMessage:
        "Updated deployment key. You must reload the browser extension",
      errorMessage: "Error updating deployment key",
    },
    [deploymentKey, setDeploymentKey],
  );

  return [deploymentKey, update] as const;
}

export default useDeploymentKeySetting;
