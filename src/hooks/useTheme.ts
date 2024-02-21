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

import { useEffect } from "react";
import { DEFAULT_THEME } from "@/themes/themeTypes";
import {
  addThemeClassToDocumentRoot,
  setThemeFavicon,
  type ThemeAssets,
} from "@/themes/themeUtils";
import useAsyncState from "@/hooks/useAsyncState";
import { getActiveTheme, initialTheme } from "@/themes/themeStore";
import { useSelector } from "react-redux";
import { selectSettings } from "@/store/settings/settingsSelectors";

/**
 * Hook to activate the PixieBrix or partner theme.
 */
function useTheme(): ThemeAssets {
  const { partnerId } = useSelector(selectSettings);
  // TODO: figure out a way to get this to return the local storage cache first instead of a static initialValue
  const { data } = useAsyncState(getActiveTheme, [partnerId], {
    initialValue: initialTheme,
  });
  useEffect(() => {
    addThemeClassToDocumentRoot(data.baseThemeName ?? DEFAULT_THEME);
    setThemeFavicon(data.baseThemeName ?? DEFAULT_THEME);
  }, [data.baseThemeName]);

  return data;
}

export default useTheme;
