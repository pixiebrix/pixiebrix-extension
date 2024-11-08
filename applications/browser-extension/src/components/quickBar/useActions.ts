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

import { type Action, useKBar } from "kbar";
import React from "react";
import quickBarRegistry from "./quickBarRegistry";
import useOnMountOnly from "../../hooks/useOnMountOnly";

function useActions(): void {
  // The useActions hook is included in KBarComponent, which mounts/unmounts when the kbar is toggled

  const { query } = useKBar();
  const uninstallActionsRef = React.useRef<(() => void) | null>(null);

  const handler = (nextActions: Action[]) => {
    uninstallActionsRef.current?.();
    // Potential improvement: to avoid flickering, we could register actions individually and keep track of
    // their uninstall handlers by id.
    uninstallActionsRef.current = query.registerActions(nextActions);
  };

  // Listen for changes while the kbar is mounted:
  // - The user is making edits in the Page Editor
  // - Generators are producing new actions in response to the search query changing
  // The query is available on initial mount
  useOnMountOnly(() => {
    // Don't use useRegisterActions, because then we aren't able to unregister actions that were around
    // from the initial mount
    handler(quickBarRegistry.currentActions);

    quickBarRegistry.changeEvent.add(handler);
    return () => {
      quickBarRegistry.changeEvent.remove(handler);
    };
  });
}

export default useActions;
