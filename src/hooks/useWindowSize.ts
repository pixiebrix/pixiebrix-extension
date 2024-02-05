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

import { useSyncExternalStore } from "use-sync-external-store/shim";

// Store as object - getSnapshot() must return reference to same object to avoid re-renders
let windowSize = {
  width: 0,
  height: 0,
};

interface WindowSize {
  width: number;
  height: number;
}

function subscribe(callback: () => void) {
  window.addEventListener("resize", callback);

  return () => {
    window.removeEventListener("resize", callback);
  };
}

function getSnapshot(): WindowSize {
  const newWidth = window.innerWidth;
  const newHeight = window.innerHeight;

  if (newWidth !== windowSize.width || newHeight !== windowSize.height) {
    windowSize = {
      width: newWidth,
      height: newHeight,
    };
  }

  return windowSize;
}

/**
 * Hook to get the current window size.
 */
export function useWindowSize(): WindowSize {
  return useSyncExternalStore(subscribe, getSnapshot);
}
