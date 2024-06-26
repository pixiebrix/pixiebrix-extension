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
import { initialTheme } from "@/themes/themeStore";
import useAsyncExternalStore from "@/hooks/useAsyncExternalStore";
import { activateTheme } from "@/background/messenger/api";

const themeStorageSubscribe = (callback: () => void) => {
  const abortController = new AbortController();
  themeStorage.onChanged(callback, abortController.signal);
  return () => {
    abortController.abort();
  };
};

/**
 * Hook to retrieve the active theme. The source of truth for the current theme is in `themeStorage` which
 * is updated by the background script's initTheme method.
 * @see getActiveTheme
 */
function useTheme(): { activeTheme: ThemeAssets; isLoading: boolean } {
  // The active theme is fetched with `getActiveTheme` in the background script and cached in the themeStorage,
  // This hook subscribes to changes in themeStorage to retrieve the latest current activeTheme
  const { data: cachedTheme, isLoading } = useAsyncExternalStore(
    themeStorageSubscribe,
    themeStorage.get,
  );

  useEffect(() => {
    if (
      !isLoading &&
      cachedTheme &&
      (!cachedTheme.lastFetched ||
        Date.now() > cachedTheme.lastFetched + 120_000)
    ) {
      // Re-fetch the theme if it has not been fetched in the past 2 minutes
      void activateTheme();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-activate theme when loading finishes on mount
  }, [isLoading]);

  const activeTheme = useMemo(
    () => (!isLoading && cachedTheme ? cachedTheme : initialTheme),
    [cachedTheme, isLoading],
  );

  useEffect(() => {
    addThemeClassToDocumentRoot(activeTheme.themeName);
    setThemeFavicon(activeTheme.themeName);
  }, [activeTheme, cachedTheme, isLoading]);

  return { activeTheme, isLoading };
}

export default useTheme;
