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

import { useEffect, useState } from "react";

/**
 * Hook that returns `true` after `millis` milliseconds.
 * @param millis milliseconds to wait after mount, or null to clear the timeout
 */
export default function useTimeoutState(millis: number | null): boolean {
  const [state, setState] = useState(false);

  useEffect(() => {
    if (millis == null) {
      setState(false);
      return;
    }

    const timer = setTimeout(setState, millis, true);
    return () => {
      clearTimeout(timer);
    };
  }, [millis]);

  return state;
}
