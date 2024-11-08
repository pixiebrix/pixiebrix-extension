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

import {
  DEFAULT_THEME,
  type ThemeName,
  THEME_NAMES,
} from "./themeTypes";
import betaLogo from "../../img/beta-logo.svg";
import betaLogoSmall from "../../img/beta-logo-small.svg";
import logo from "../../img/logo.svg";
import logoSmall from "../../img/logo-small.svg";
import aaLogo from "../../img/aa-logo.svg";
import aaLogoSmall from "../../img/aa-logo-small.png";
import { StorageItem } from "webext-storage";
import { type Nullishable } from "../utils/nullishUtils";

export const isValidThemeName = (
  themeName: Nullishable<string>,
): themeName is ThemeName =>
  typeof themeName === "string" && THEME_NAMES.includes(themeName);

export type ThemeLogo = {
  regular: string;
  small: string;
};

type ThemeLogoMap = {
  [key in ThemeName]: ThemeLogo;
};

/** @internal */
export const THEME_LOGOS: ThemeLogoMap = {
  beta: {
    regular: betaLogo,
    small: betaLogoSmall,
  },
  default: {
    regular: logo,
    small: logoSmall,
  },
  "automation-anywhere": {
    regular: aaLogo,
    small: aaLogoSmall,
  },
};

export type ThemeAssets = {
  logo: ThemeLogo;
  showSidebarLogo: boolean;
  /** URL to a png or a svg */
  customSidebarLogo: Nullishable<string>;
  /** URL to a svg */
  toolbarIcon: Nullishable<string>;
  /** The base theme name */
  themeName: ThemeName;
  /** Internal attribute that tracks when the active theme was last fetched and calculated for re-fetching purposes */
  lastFetched: Nullishable<number>;
};

// Note: this function is re-used in the app. Should not reference
// anything unavailable in the app environment, e.g. the background page
export const getThemeLogo = (themeName: string): ThemeLogo => {
  if (isValidThemeName(themeName)) {
    // eslint-disable-next-line security/detect-object-injection -- themeName is type ThemeName, a union type of string literal
    return THEME_LOGOS[themeName];
  }

  // eslint-disable-next-line security/detect-object-injection -- themeName not user defined
  return THEME_LOGOS[DEFAULT_THEME];
};

// Note: this function is re-used in the app. Should not reference
// anything unavailable in the app environment, e.g. the background page
export const addThemeClassToDocumentRoot = (themeName: ThemeName): void => {
  for (const theme of THEME_NAMES) {
    document.documentElement.classList.remove(theme);
  }

  if (themeName && themeName !== DEFAULT_THEME) {
    document.documentElement.classList.add(themeName);
  }
};

export const setThemeFavicon = (themeName: ThemeName): void => {
  const favicon = document.querySelector("link[rel='icon']");
  if (!favicon) {
    // Not all pages have favicons
    return;
  }

  if (themeName === "default") {
    // FIXME: The favicon isn't reset back to the default after being set to AA.
    //  The page needs to be reloaded to reset the favicon
    //  https://github.com/pixiebrix/pixiebrix-extension/issues/7685
    favicon.removeAttribute("href");
  } else {
    const { small: icon } = getThemeLogo(themeName);
    favicon.setAttribute("href", icon);
  }
};

export const themeStorage = new StorageItem<ThemeAssets>("THEME");
