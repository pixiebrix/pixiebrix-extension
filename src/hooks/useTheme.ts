/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { selectSettings } from "@/store/settingsSelectors";
import settingsSlice from "@/store/settingsSlice";
import { useDispatch, useSelector } from "react-redux";
import { DEFAULT_THEME, type Theme } from "@/themes/themeTypes";
import { activatePartnerTheme } from "@/background/messenger/api";
import {
  addThemeClassToDocumentRoot,
  getThemeLogo,
  isValidTheme,
  setThemeFavicon,
  type ThemeLogo,
} from "@/themes/themeUtils";
import { appApi } from "@/services/api";
import { selectAuth } from "@/auth/authSelectors";
import useManagedStorageState from "@/store/enterprise/useManagedStorageState";
import { isEmpty } from "lodash";
import ReduxPersistenceContext from "@/store/ReduxPersistenceContext";

async function activateBackgroundTheme(
  flush: () => Promise<void>
): Promise<void> {
  // Flush the Redux state to localStorage to ensure the background page sees the latest state
  await flush();
  await activatePartnerTheme();
}

export function useGetTheme(): Theme {
  const { theme, partnerId } = useSelector(selectSettings);
  const { partner: cachedPartner } = useSelector(selectAuth);
  const { data: me } = appApi.endpoints.getMe.useQueryState();
  const dispatch = useDispatch();

  const partnerTheme = useMemo(() => {
    if (!isEmpty(me)) {
      const meTheme = me.partner?.theme;
      return isValidTheme(meTheme) ? meTheme : null;
    }

    const cachedTheme = cachedPartner?.theme;
    return isValidTheme(cachedTheme) ? cachedTheme : null;
  }, [me, cachedPartner?.theme]);

  const { data: managedState, isLoading: managedPartnerIdIsLoading } =
    useManagedStorageState();
  const managedPartnerId = managedState?.partnerId;

  useEffect(() => {
    if (partnerId === null && !managedPartnerIdIsLoading) {
      // Initialize initial partner id with the one in managed storage, if any
      dispatch(
        settingsSlice.actions.setPartnerId({
          partnerId: managedPartnerId ?? "",
        })
      );
    }
  }, [partnerId, dispatch, managedPartnerIdIsLoading, managedPartnerId]);

  useEffect(() => {
    // Update persisted Redux slice
    dispatch(
      settingsSlice.actions.setTheme({
        theme: partnerTheme ?? partnerId ?? DEFAULT_THEME,
      })
    );
  }, [dispatch, partnerId, partnerTheme, theme]);

  return theme;
}

export function useGetOrganizationTheme(): {
  showSidebarLogo: boolean;
  customSidebarLogo: string;
} {
  const { data: me } = appApi.endpoints.getMe.useQueryState();
  const { organization: cachedOrganization } = useSelector(selectAuth);

  const organizationTheme = me
    ? me.organization?.theme
    : cachedOrganization?.theme;

  return {
    showSidebarLogo: organizationTheme
      ? Boolean(organizationTheme.show_sidebar_logo)
      : true,
    customSidebarLogo: organizationTheme?.logo || null,
  };
}

type ThemeAssets = {
  logo: ThemeLogo;
  showSidebarLogo: boolean;
  customSidebarLogo: string;
};

/**
 * Hook to activate the PixieBrix or partner theme.
 * @param theme the theme to use, or nullish to automatically determine the theme.
 */
function useTheme(theme?: Theme): ThemeAssets {
  const { flush: flushReduxPersistence } = useContext(ReduxPersistenceContext);
  const inferredTheme = useGetTheme();
  const organizationTheme = useGetOrganizationTheme();
  const themeLogo = getThemeLogo(theme ?? inferredTheme);

  useEffect(() => {
    void activateBackgroundTheme(flushReduxPersistence);
    addThemeClassToDocumentRoot(theme ?? inferredTheme);
    setThemeFavicon(theme ?? inferredTheme);
  }, [theme, inferredTheme, flushReduxPersistence]);

  return {
    logo: themeLogo,
    ...organizationTheme,
  };
}

export default useTheme;
