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
import { useSelector } from "react-redux";
import { selectSettings } from "@/store/settingsSelectors";

const THEMES = ["automation-anywhere"];

const useTheme = () => {
  const { partnerId } = useSelector(selectSettings);

  useEffect(() => {
    if (partnerId && THEMES.includes(partnerId)) {
      document.documentElement.classList.add(partnerId);
    } else {
      for (const theme of THEMES) {
        document.documentElement.classList.remove(theme);
      }
    }
  }, [partnerId]);
};

export default useTheme;
