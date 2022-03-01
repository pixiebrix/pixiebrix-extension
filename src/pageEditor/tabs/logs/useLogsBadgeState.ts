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

import { Variant } from "react-bootstrap/types";
import { useSelector } from "react-redux";
import { selectLogs } from "@/components/logViewer/logSelectors";
import { useMemo } from "react";
import { groupBy } from "lodash";

function useLogsBadgeState(): [number, Variant] | [undefined, undefined] {
  const { availableEntries, entries } = useSelector(selectLogs);

  const unreadByLevels = useMemo(() => {
    const lastTimestamp = Math.max(...entries.map((x) => Number(x.timestamp)));
    const unread = availableEntries.filter(
      (x) => Number(x.timestamp) > lastTimestamp
    );

    return groupBy(unread, (x) => x.level);
  }, [availableEntries, entries]);

  for (const [level, variant] of [
    ["error", "danger"],
    ["warning", "warning"],
  ]) {
    // eslint-disable-next-line security/detect-object-injection -- constant levels above
    const unreadCount: number = unreadByLevels[level]?.length ?? 0;
    if (unreadCount > 0) {
      return [unreadCount, variant];
    }
  }

  return [undefined, undefined];
}

export default useLogsBadgeState;
