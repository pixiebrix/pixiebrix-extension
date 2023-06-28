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

import { type ModViewItem } from "@/types/modTypes";
import { useCallback } from "react";
import { type OptionsState } from "@/store/extensionsTypes";
import { selectExtensionsFromMod } from "@/utils/modUtils";
import { useSelector } from "react-redux";
import useModPermissions from "@/mods/hooks/useModPermissions";

function useRequestPermissionsAction(
  modViewItem: ModViewItem
): () => void | null {
  const { mod } = modViewItem;

  // Without memoization, the selector reference changes on every render, which causes useModPermissions
  // to recompute, spamming the background worker with service locator requests
  const memoizedExtensionsSelector = useCallback(
    (state: { options: OptionsState }) => selectExtensionsFromMod(state, mod),
    [mod]
  );

  const extensionsFromMod = useSelector(memoizedExtensionsSelector);

  const { hasPermissions, requestPermissions } =
    useModPermissions(extensionsFromMod);

  return hasPermissions ? null : requestPermissions;
}

export default useRequestPermissionsAction;
