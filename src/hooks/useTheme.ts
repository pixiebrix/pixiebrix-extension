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

const THEME_LOGOS = {
  default: {
    regular: logo,
    small: logoSmall,
  },
  "automation-anywhere": {
    regular: aaLogo,
    small: aaLogoSmall,
  },
};

const useTheme = (): { logo: string; logoSmall: string } => {
  const { theme } = useSelector(selectSettings);
  const dispatch = useDispatch();
  const [partnerId, isLoading] = useAsyncState(
    readStorage(MANAGED_PARTNER_ID_KEY, undefined, "managed"),
    [],
    null
  );

  useEffect(() => {
    // Initialize initial theme state with the user's partner theme, if any
    if (theme === null && !isLoading) {
      dispatch(
        settingsSlice.actions.setTheme({
          theme: partnerId ?? DEFAULT_THEME,
        })
      );
    }

    for (const theme of THEMES) {
      document.documentElement.classList.remove(theme);
    }

    if (theme && theme !== DEFAULT_THEME && THEMES.includes(theme)) {
      document.documentElement.classList.add(theme);
    }
  }, [isLoading, dispatch, partnerId, theme]);

  return {
    logo: theme && THEME_LOGOS[theme] ? THEME_LOGOS[theme].regular : logo,
    logoSmall:
      theme && THEME_LOGOS[theme] ? THEME_LOGOS[theme].small : logoSmall,
  };
};

export default useTheme;
