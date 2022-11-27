/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { useEffect, useState } from "react";

function useQuickbarShortcut(): {
  shortcut: string | null;
  isConfigured: boolean;
} {
  const [shortcut, setShortcut] = useState(null);

  useEffect(() => {
    chrome.commands.getAll((commands) => {
      const command = commands.find(
        (command) => command.name === "toggle-quick-bar"
      );
      if (command) {
        setShortcut(command.shortcut);
      }
    });
  }, []);

  const isConfigured = shortcut !== "";

  return {
    // Optimistically return as isConfigured so interface doesn't show a warning
    isConfigured: isConfigured || shortcut == null,
    shortcut: isConfigured ? shortcut : null,
  };
}

export default useQuickbarShortcut;
