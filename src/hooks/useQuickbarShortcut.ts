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

import chromeP from "webext-polyfill-kinda";
import useAsyncState from "@/hooks/useAsyncState";

function useQuickbarShortcut(): {
  shortcut: string | null;
  isConfigured: boolean;
} {
  // Can't use useAsyncExternalStore because Chrome doesn't provide an API for subscribing to command changes
  const { data: shortcut } = useAsyncState(async () => {
    const commands = await chromeP.commands.getAll();
    const command = commands.find(
      (command) => command.name === "toggle-quick-bar"
    );
    return command?.shortcut;
  }, []);

  const isConfigured = shortcut !== "";

  return {
    // Optimistically return as isConfigured so interface doesn't show a warning
    // TODO: rewrite this hook to return AsyncState so call-site can decide how to handle loading state
    isConfigured: isConfigured || shortcut == null,
    shortcut: isConfigured ? shortcut : null,
  };
}

export default useQuickbarShortcut;
