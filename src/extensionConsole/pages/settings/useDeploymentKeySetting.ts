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
      await setDeploymentKey(value as DeploymentKey);
    },
    {
      successMessage:
        "Updated deployment key. You must reload the browser extension",
      errorMessage: "Error updating deployment key",
    },
    [setDeploymentKey],
  );

  return [deploymentKey, update] as const;
}

export default useDeploymentKeySetting;
