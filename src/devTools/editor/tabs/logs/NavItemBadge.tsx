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

import { selectLogs } from "@/components/logViewer/logSelectors";
import { groupBy } from "lodash";
import React, { useMemo } from "react";
import { Badge } from "react-bootstrap";
import { useSelector } from "react-redux";

const NavItemBadge: React.VoidFunctionComponent = () => {
  const { allEntries, displayedEntries } = useSelector(selectLogs);
  console.log("NavItemBadge 1", { allEntries, displayedEntries });

  const unreadByLevels = useMemo(() => {
    const lastTimestamp = Math.max(
      ...displayedEntries.map((x) => Number(x.timestamp))
    );
    const unread = allEntries.filter(
      (x) => Number(x.timestamp) > lastTimestamp
    );

    return groupBy(unread, (x) => x.level);
  }, [allEntries, displayedEntries]);

  console.log("NavItemBadge", { allEntries, displayedEntries, unreadByLevels });

  for (const [level, variant] of [
    ["error", "danger"],
    ["warning", "warning"],
  ]) {
    // eslint-disable-next-line security/detect-object-injection -- constant levels above
    const numLevel = unreadByLevels[level];
    if (numLevel) {
      return (
        <Badge className="mx-1" variant={variant}>
          {numLevel.length}
        </Badge>
      );
    }
  }

  return null;
};

export default NavItemBadge;
