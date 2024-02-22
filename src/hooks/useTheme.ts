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

import { useEffect, useMemo } from "react";
import {
  addThemeClassToDocumentRoot,
  setThemeFavicon,
  type ThemeAssets,
  themeStorage,
} from "@/themes/themeUtils";
import useAsyncState from "@/hooks/useAsyncState";
import { getActiveTheme, initialTheme } from "@/themes/themeStore";
import useAsyncExternalStore from "@/hooks/useAsyncExternalStore";

const themeStorageSubscribe = (callback: () => void) => {
  const abortController = new AbortController();
  themeStorage.onChanged(callback, abortController.signal);
  return () => {
    abortController.abort();
  };
};

/**
 * Hook to retrieve the active theme.
 */
function useTheme(): ThemeAssets {
  // The active theme is fetched with `getActiveTheme` in the background script and cached in the themeStorage,
  // This hook subscribes to changes in themeStorage to retrieve the latest current activeTheme
  const { data, isLoading, error } = useAsyncExternalStore(
    themeStorageSubscribe,
    // NEXT PR commit: see if we can just access the storage rather than refetch getActiveTheme
    getActiveTheme,
  );
  const { data: cachedTheme } = useAsyncState(themeStorage.get, []);

  const activeTheme = useMemo(() => {
    if (isLoading || error) {
      return cachedTheme ?? initialTheme;
    }

    return data;
  }, [cachedTheme, data, error, isLoading]);

  useEffect(() => {
    addThemeClassToDocumentRoot(activeTheme.baseThemeName);
    setThemeFavicon(activeTheme.baseThemeName);
  }, [activeTheme, data, isLoading]);

  return activeTheme;
}

export default useTheme;
