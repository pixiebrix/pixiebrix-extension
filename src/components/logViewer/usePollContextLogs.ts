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

import { getLog } from "@/background/logging";
import { MessageContext } from "@/core";
import useInterval from "@/hooks/useInterval";
import { useState } from "react";

const REFRESH_INTERVAL = 1000;

function usePollContextLogs({ context }: { context: MessageContext | null }) {
  const [entries, setEntries] = useState([]);

  useInterval(async () => {
    if (context === null && entries.length > 0) {
      setEntries([]);
      return;
    }

    const logEntries = await getLog(context);
    setEntries(logEntries);
  }, REFRESH_INTERVAL);

  return entries;
}

export default usePollContextLogs;
