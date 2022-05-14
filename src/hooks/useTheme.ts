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

import { useEffect } from "react";
import { selectSettings } from "@/store/settingsSelectors";
import { useAsyncState } from "@/hooks/common";
import { ManualStorageKey, readStorage } from "@/chrome";
import settingsSlice from "@/store/settingsSlice";
import { useDispatch, useSelector } from "react-redux";
import { DEFAULT_THEME, THEMES } from "@/options/constants";
import logo from "@img/logo.svg";
import logoSmall from "@img/logo-small-rounded.svg";
import aaLogo from "@img/aa-logo.svg";
import aaLogoSmall from "@img/aa-logo-small.svg";

const MANAGED_PARTNER_ID_KEY = "partnerId" as ManualStorageKey;

type ThemeLogo = {
  regular: string;
  small: string;
};

type ThemeLogoMap = {
  [key in Theme]: ThemeLogo;
};

export type Theme = typeof THEMES[number];

const THEME_LOGOS: ThemeLogoMap = {
  default: {
    regular: logo,
    small: logoSmall,
  },
  "automation-anywhere": {
    regular: aaLogo,
    small: aaLogoSmall,
  },
};

const getThemeLogo = (theme: string): ThemeLogo | undefined =>
  // eslint-disable-next-line security/detect-object-injection -- theme is user defined, but restricted to themes
  THEME_LOGOS[theme];

const useTheme = (): { logo: ThemeLogo } => {
  const { theme } = useSelector(selectSettings);
  const dispatch = useDispatch();
  const [partnerId, isLoading] = useAsyncState(
    readStorage(MANAGED_PARTNER_ID_KEY, undefined, "managed"),
    [],
    null
  );
  const themeLogo = getThemeLogo(theme);

  useEffect(() => {
    // Initialize initial theme state with the user's partner theme, if any
    if (theme == null && !isLoading) {
      dispatch(
        settingsSlice.actions.setTheme({
          theme: partnerId ?? DEFAULT_THEME,
        })
      );
    }

    document.documentElement.classList.remove(...THEMES);

    if (theme && theme !== DEFAULT_THEME && THEMES.includes(theme)) {
      document.documentElement.classList.add(theme);
    }
  }, [isLoading, dispatch, partnerId, theme]);

  return {
    // eslint-disable-next-line security/detect-object-injection -- Not user-provided
    logo: themeLogo ?? THEME_LOGOS[DEFAULT_THEME],
  };
};

export default useTheme;
