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
import settingsSlice from "@/store/settingsSlice";
import { useDispatch, useSelector } from "react-redux";
import { DEFAULT_THEME, Theme, THEMES } from "@/options/constants";
import logo from "@img/logo.svg";
import logoSmall from "@img/logo-small-rounded.svg";
import aaLogo from "@img/aa-logo.svg";
import aaLogoSmall from "@img/aa-logo-small.svg";
import { activatePartnerTheme } from "@/background/messenger/api";
import { persistor } from "@/options/store";
import { useAsyncState } from "@/hooks/common";
import { ManualStorageKey, readStorage } from "@/chrome";
import { isValidTheme } from "@/utils/themeUtils";

const MANAGED_PARTNER_ID_KEY = "partnerId" as ManualStorageKey;

type ThemeLogo = {
  regular: string;
  small: string;
};

type ThemeLogoMap = {
  [key in Theme]: ThemeLogo;
};

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

export const getThemeLogo = (theme: string): ThemeLogo => {
  if (isValidTheme(theme)) {
    // eslint-disable-next-line security/detect-object-injection -- theme is type Theme, a union type of string literal
    return THEME_LOGOS[theme];
  }

  // eslint-disable-next-line security/detect-object-injection -- theme not user defined
  return THEME_LOGOS[DEFAULT_THEME];
};

const useTheme = (): { logo: ThemeLogo } => {
  const { theme, partnerId } = useSelector(selectSettings);
  const dispatch = useDispatch();
  const themeLogo = getThemeLogo(theme);

  const [managedPartnerId, isLoading] = useAsyncState(
    readStorage(MANAGED_PARTNER_ID_KEY, undefined, "managed"),
    [],
    null
  );

  useEffect(() => {
    if (partnerId === null && !isLoading) {
      // Initialize initial partner id with the one in managed storage, if any
      dispatch(
        settingsSlice.actions.setPartnerId({
          partnerId: managedPartnerId ?? "",
        })
      );
    }
  }, [partnerId, dispatch, isLoading, managedPartnerId]);

  useEffect(() => {
    dispatch(
      settingsSlice.actions.setTheme({
        theme: partnerId ?? DEFAULT_THEME,
      })
    );

    for (const theme of THEMES) {
      document.documentElement.classList.remove(theme);
    }

    void activatePartnerTheme();
    void persistor.flush();

    if (theme && theme !== DEFAULT_THEME) {
      document.documentElement.classList.add(theme);
    }
  }, [theme]);

  return {
    logo: themeLogo,
  };
};

export default useTheme;
