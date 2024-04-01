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

import useEventListener from "./useEventListener";

/**
 * Basic keyboard shortcut hook. If we introduce more shortcuts, we should consider using a library.
 * @param code the key code, e.g., "F5"
 * @param callback the callback to call when the key is pressed.
 */
function useKeyboardShortcut(code: string, callback: () => void): void {
  const handleShortcut = (event: KeyboardEvent) => {
    if (event.code === code) {
      callback();
    }
  };

  useEventListener(document, "keydown", handleShortcut);
}

export default useKeyboardShortcut;
