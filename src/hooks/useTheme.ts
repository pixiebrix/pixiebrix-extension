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

import { useContext, useEffect, useMemo } from "react";
import { selectSettings } from "@/store/settings/settingsSelectors";
import settingsSlice from "@/store/settings/settingsSlice";
import { useDispatch, useSelector } from "react-redux";
import { DEFAULT_THEME, type ThemeName } from "@/themes/themeTypes";
import { activateTheme } from "@/background/messenger/strict/api";
import {
  addThemeClassToDocumentRoot,
  getThemeLogo,
  isValidThemeName,
  setThemeFavicon,
  ThemeAssets,
} from "@/themes/themeUtils";
import { appApi } from "@/services/api";
import { selectAuth } from "@/auth/authSelectors";
import useManagedStorageState from "@/store/enterprise/useManagedStorageState";
import { isEmpty } from "lodash";
import ReduxPersistenceContext from "@/store/ReduxPersistenceContext";

async function activateBackgroundTheme(
  flush: () => Promise<void>,
): Promise<void> {
  // Flush the Redux state to localStorage to ensure the background page sees the latest state
  await flush();
  await activateTheme();
}

/**
 * Calculate the active theme and set it on the settings slice.
 *
 * If not in a React context, use getActiveTheme instead.
 *
 * @see getActiveTheme
 * @returns the active theme name
 */
export function useGetThemeName(): ThemeName {
  const { theme, partnerId } = useSelector(selectSettings);
  const { partner: cachedPartner } = useSelector(selectAuth);
  const { data: me } = appApi.endpoints.getMe.useQueryState();
  const dispatch = useDispatch();

  const partnerTheme = useMemo(() => {
    if (!isEmpty(me)) {
      const meTheme = me.partner?.theme;
      return isValidThemeName(meTheme) ? meTheme : null;
    }

    const cachedTheme = cachedPartner?.theme;
    return isValidThemeName(cachedTheme) ? cachedTheme : null;
  }, [me, cachedPartner?.theme]);

  const { data: managedState, isLoading: managedPartnerIdIsLoading } =
    useManagedStorageState();
  const managedPartnerId = managedState?.partnerId;

  useEffect(() => {
    if (partnerId == null && !managedPartnerIdIsLoading) {
      // Initialize initial partner id with the one in managed storage, if any
      dispatch(
        settingsSlice.actions.setPartnerId({
          partnerId: managedPartnerId ?? "",
        }),
      );
    }
  }, [partnerId, dispatch, managedPartnerIdIsLoading, managedPartnerId]);

  useEffect(() => {
    // Update persisted Redux slice
    dispatch(
      settingsSlice.actions.setTheme({
        theme: partnerTheme ?? partnerId ?? DEFAULT_THEME,
      }),
    );
  }, [dispatch, partnerId, partnerTheme, theme]);

  return theme;
}

export function useGetOrganizationTheme(): {
  showSidebarLogo: boolean;
  customSidebarLogo: string;
  toolbarIcon: string;
} {
  const { data: me } = appApi.endpoints.getMe.useQueryState();
  const { organization: cachedOrganization } = useSelector(selectAuth);

  const organizationTheme = useMemo(
    () => (me ? me.organization?.theme : cachedOrganization?.theme),
    [cachedOrganization, me],
  );

  return {
    showSidebarLogo: organizationTheme
      ? Boolean(organizationTheme.show_sidebar_logo)
      : true,
    customSidebarLogo: organizationTheme?.logo || null,
    toolbarIcon: organizationTheme?.toolbar_icon || null,
  };
}

/**
 * Hook to activate the PixieBrix or partner theme.
 * @param themeName the themeName to use, or nullish to automatically determine the theme.
 */
function useTheme(themeName?: ThemeName): ThemeAssets {
  const { flush: flushReduxPersistence } = useContext(ReduxPersistenceContext);
  const inferredTheme = useGetThemeName();
  const organizationTheme = useGetOrganizationTheme();
  const themeLogo = getThemeLogo(themeName ?? inferredTheme);

  useEffect(() => {
    void activateBackgroundTheme(flushReduxPersistence);
    addThemeClassToDocumentRoot(themeName ?? inferredTheme);
    setThemeFavicon(themeName ?? inferredTheme);
  }, [themeName, inferredTheme, flushReduxPersistence]);

  return {
    logo: themeLogo,
    ...organizationTheme,
    baseThemeName: themeName,
  };
}

export default useTheme;
