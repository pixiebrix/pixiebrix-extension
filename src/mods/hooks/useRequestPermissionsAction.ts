/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { type InstallableViewItem } from "@/mods/installableTypes";
import { useCallback } from "react";
import { type OptionsState } from "@/store/extensionsTypes";
import { selectExtensionsFromInstallable } from "@/utils/installableUtils";
import { useSelector } from "react-redux";
import useInstallablePermissions from "@/mods/hooks/useInstallablePermissions";

function useRequestPermissionsAction(
  installableViewItem: InstallableViewItem
): () => void | null {
  const { installable } = installableViewItem;

  // Without memoization, the selector reference changes on every render, which causes useInstallablePermissions
  // to recompute, spamming the background worker with service locator requests
  const memoizedExtensionsSelector = useCallback(
    (state: { options: OptionsState }) =>
      selectExtensionsFromInstallable(state, installable),
    [installable]
  );

  const extensionsFromInstallable = useSelector(memoizedExtensionsSelector);

  const { hasPermissions, requestPermissions } = useInstallablePermissions(
    extensionsFromInstallable
  );

  return hasPermissions ? null : requestPermissions;
}

export default useRequestPermissionsAction;
