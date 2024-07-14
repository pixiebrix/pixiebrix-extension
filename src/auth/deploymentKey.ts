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

import useUpdatableAsyncState from "@/hooks/useUpdatableAsyncState";
import { readManagedStorageByKey } from "@/store/enterprise/managedStorage";
import { StorageItem } from "webext-storage";
import { type DeploymentKey } from "@/auth/authTypes";

/**
 * User-configured deployment key. Overrides the managed storage deployment key (if any)
 * @since 2.0.6
 */
export const deploymentKeyStorage = new StorageItem<DeploymentKey>(
  "deploymentKey",
);

/**
 * Returns the shared deployment key, or undefined if not set.
 *
 * Set by, in order of precedence:
 * - Settings on the SettingsPage
 * - Managed storage (configured by Enterprise IT)
 */
export async function getDeploymentKey(): Promise<DeploymentKey | undefined> {
  const configured = await deploymentKeyStorage.get();
  if (configured) {
    return configured;
  }

  return readManagedStorageByKey("deploymentKey");
}

type ConfiguredDeploymentKeyResult = [
  DeploymentKey | undefined,
  (deploymentKey: DeploymentKey | undefined) => Promise<void>,
];

async function setter(deploymentKey: DeploymentKey | undefined): Promise<void> {
  if (deploymentKey == null) {
    return deploymentKeyStorage.remove();
  }

  return deploymentKeyStorage.set(deploymentKey);
}

/**
 * User-configured deployment key. Overrides the managed deployment key.
 */
export function useConfiguredDeploymentKey(): ConfiguredDeploymentKeyResult {
  return useUpdatableAsyncState<DeploymentKey | undefined>(
    deploymentKeyStorage.get,
    setter,
  );
}
