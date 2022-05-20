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
import { DEFAULT_THEME } from "@/options/types";
import { activatePartnerTheme } from "@/background/messenger/api";
import { persistor } from "@/options/store";
import { useAsyncState } from "@/hooks/common";
import { ManualStorageKey, readStorage } from "@/chrome";
import {
  addThemeClassToDocumentRoot,
  getThemeLogo,
  ThemeLogo,
} from "@/utils/themeUtils";

const MANAGED_PARTNER_ID_KEY = "partnerId" as ManualStorageKey;

const activateBackgroundTheme = async (): Promise<void> => {
  // Flush the Redux state to localStorage to ensure the background page sees the latest state
  await persistor.flush();
  await activatePartnerTheme();
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

    void activateBackgroundTheme();
    addThemeClassToDocumentRoot(theme);
  }, [dispatch, partnerId, theme]);

  return {
    logo: themeLogo,
  };
};

export default useTheme;
