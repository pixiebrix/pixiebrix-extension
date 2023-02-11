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

import { type Action, useKBar } from "kbar";
import React, { useEffect } from "react";
import quickBarRegistry from "@/components/quickBar/quickBarRegistry";

function useActions(): void {
  // The useActions hook is included in KBarComponent, which mounts/unmounts when the kbar is toggled

  const { query } = useKBar();
  const uninstallActionsRef = React.useRef<() => void | null>(null);

  // Listen for changes while the kbar is mounted:
  // - The user is making edits in the Page Editor
  // - Generators are producing new actions in response to the search query changing
  useEffect(() => {
    const handler = (nextActions: Action[]) => {
      uninstallActionsRef.current?.();
      // Potential improvement: to avoid flickering, we could register actions individually and keep track of
      // their uninstall handlers by id.
      uninstallActionsRef.current = query.registerActions(nextActions);
    };

    // Don't use useRegisterActions, because then we aren't able to unregister actions that were around
    // from the initial mount
    handler(quickBarRegistry.currentActions);

    quickBarRegistry.addListener(handler);
    return () => {
      quickBarRegistry.removeListener(handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the query is available on initial mount
  }, []);
}

export default useActions;
