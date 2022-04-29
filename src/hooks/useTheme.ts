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
import useFlags from "@/hooks/useFlags";
import { useAsyncState } from "@/hooks/common";
import { ManualStorageKey, readStorage } from "@/chrome";
import settingsSlice from "@/store/settingsSlice";
import { useDispatch, useSelector } from "react-redux";

const MANAGED_PARTNER_ID_KEY = "partnerId" as ManualStorageKey;
const THEMES = ["automation-anywhere"];

const useTheme = () => {
  const { theme } = useSelector(selectSettings);
  const dispatch = useDispatch();
  const { permit } = useFlags();
  const [partnerId] = useAsyncState(
    readStorage(MANAGED_PARTNER_ID_KEY, undefined, "managed")
  );

  useEffect(() => {
    if (permit("partner-theming")) {
      return;
    }

    // Initial state
    if (theme === undefined) {
      dispatch(
        settingsSlice.actions.setTheme({
          partnerId,
        })
      );
    }

    if (theme && THEMES.includes(theme)) {
      document.documentElement.classList.add(theme);
    } else {
      for (const theme of THEMES) {
        document.documentElement.classList.remove(theme);
      }
    }
  }, [dispatch, partnerId, theme, permit]);
};

export default useTheme;
