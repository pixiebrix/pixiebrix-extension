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

import { getLog, LogEntry } from "@/background/logging";
import { MessageContext } from "@/core";
import useInterval from "@/hooks/useInterval";
import { isEqual } from "lodash";
import { useEffect, useState } from "react";

const REFRESH_INTERVAL = 3000;

/**
 * @typedef {Object} PollingState
 * @property {LogEntry[]} entries Log entries for the current MessageContext
 * @property {boolean} isLoading Whether the log is currently being loaded for the first time for the given MessageContext}
 */

/**
 * Polls logs from the storage
 * @returns {Object} state - The current state of the logs polling
 * @returns {LogEntry[]} state.entries - Log entries for the current MessageContext
 * @returns {boolean} state.isLoading - Whether the log is currently being loaded for the first time for the given MessageContext
 */
function usePollContextLogs({ context }: { context: MessageContext | null }) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setEntries([]);
    setIsLoading(true);
  }, [context]);

  useInterval(async () => {
    if (context === null) {
      if (isLoading) {
        setIsLoading(false);
      }

      return;
    }

    const logEntries = await getLog(context);

    if (logEntries.length === 0 && entries.length === 0) {
      if (isLoading) {
        setIsLoading(false);
      }

      return;
    }

    // Do deep equality check. On the log array of ~3k items it takes a fraction of a ms.
    // Makes sense to spend some cycles here to save on re-rendering of the children.
    if (!isEqual(logEntries, entries)) {
      setEntries(logEntries);
    }

    if (isLoading) {
      setIsLoading(false);
    }
  }, REFRESH_INTERVAL);

  return { entries, isLoading };
}

export default usePollContextLogs;
