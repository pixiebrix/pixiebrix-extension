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

import { useEffect, useMemo } from "react";
import { selectSettings } from "@/store/settingsSelectors";
import settingsSlice from "@/store/settingsSlice";
import { useDispatch, useSelector } from "react-redux";
import { DEFAULT_THEME, Theme } from "@/options/types";
import { activatePartnerTheme } from "@/background/messenger/api";
import { persistor } from "@/options/store";
import { useAsyncState } from "@/hooks/common";
import { ManualStorageKey, readStorage } from "@/chrome";
import {
  addThemeClassToDocumentRoot,
  getThemeLogo,
  isValidTheme,
  setThemeFavicon,
  ThemeLogo,
} from "@/utils/themeUtils";
import { useGetMeQuery } from "@/services/api";
import { selectAuth } from "@/auth/authSelectors";

const MANAGED_PARTNER_ID_KEY = "partnerId" as ManualStorageKey;

async function activateBackgroundTheme(): Promise<void> {
  // Flush the Redux state to localStorage to ensure the background page sees the latest state
  await persistor.flush();
  await activatePartnerTheme();
}

export function useGetTheme(): Theme {
  const { theme, partnerId } = useSelector(selectSettings);
  const { partner: cachedPartner } = useSelector(selectAuth);
  const { data: me } = useGetMeQuery();
  const dispatch = useDispatch();

  const partnerTheme = useMemo(() => {
    if (me) {
      const meTheme = me.partner?.theme;
      return isValidTheme(meTheme) ? meTheme : null;
    }

    const cachedTheme = cachedPartner?.theme;
    return isValidTheme(cachedTheme) ? cachedTheme : null;
  }, [me, cachedPartner?.theme]);

  // Read from the browser's managed storage. The IT department can set as part of distributing the browser extension
  // so the correct theme is applied before authentication.
  const [managedPartnerId, managedPartnerIdIsLoading] = useAsyncState(
    readStorage(MANAGED_PARTNER_ID_KEY, undefined, "managed"),
    [],
    null
  );

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

function useGetOrganizationTheme(): {
  showSidebarLogo: boolean;
  customSidebarLogo: string;
} {
  const { data: me } = useGetMeQuery();
  const { organization: cachedOrganization } = useSelector(selectAuth);

  const organizationTheme = useMemo(() => {
    if (me) {
      return me?.organization?.theme;
    }

    return cachedOrganization?.theme;
  }, [me, cachedOrganization]);

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
  const inferredTheme = useGetTheme();
  const organizationTheme = useGetOrganizationTheme();
  const themeLogo = getThemeLogo(theme ?? inferredTheme);

  useEffect(() => {
    void activateBackgroundTheme();
    addThemeClassToDocumentRoot(theme ?? inferredTheme);
    setThemeFavicon(theme ?? inferredTheme);
  }, [theme, inferredTheme]);

  return {
    logo: themeLogo,
    ...organizationTheme,
  };
}

export default useTheme;
