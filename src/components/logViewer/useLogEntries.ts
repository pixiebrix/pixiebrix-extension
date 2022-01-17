/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  clearLog,
  getLog,
  LOG_LEVELS,
  LogEntry,
  MessageLevel,
} from "@/background/logging";
import { stubTrue } from "lodash";
import { useAsyncEffect } from "use-async-effect";
import { MessageContext } from "@/core";
import LogContext from "@/components/logViewer/LogContext";

type Options = {
  context: MessageContext;
  level: MessageLevel;
  page: number;
  perPage: number;
  /**
   * Interval in milliseconds to check for new log entries, or null to turn off automatic checks
   */
  refreshInterval?: number;
};

type LogState = {
  numNew: number;
  isLoading: boolean;
  pageEntries: LogEntry[];
  hasEntries: boolean;
  numPages: number;
  refresh: () => Promise<void>;
  clear: () => Promise<void>;
};

export default function useLogEntries({
  context,
  level,
  page,
  perPage,
  refreshInterval,
}: Options): LogState {
  const [numNew, setNumNew] = useState(0);
  const [initialized, setInitialized] = useState(false);

  const { setUnread, setRefresh } = useContext(LogContext);

  const [{ entries, isLoading }, setLogState] = useState<{
    entries: LogEntry[];
    isLoading: boolean;
  }>({ entries: [], isLoading: true });

  const refresh = useCallback(
    async (isMounted = stubTrue) => {
      setLogState({ entries: [], isLoading: true });
      console.debug("Refreshing logs", { context });
      const entries = await getLog(context);
      if (!isMounted()) {
        return;
      }

      setLogState({ entries, isLoading: false });
      setNumNew(0);
      setUnread([]);
      setInitialized(true);
    },
    [context, setUnread, setInitialized]
  );

  useAsyncEffect(
    async (isMounted) => {
      await refresh(isMounted);
    },
    [refresh, setRefresh]
  );

  useEffect(() => {
    console.debug("Setting log refresh handler in LogContext");
    setRefresh(refresh);
  }, [setRefresh, refresh]);

  const filteredEntries = useMemo(
    () =>
      (entries ?? []).filter(
        // Level is coming from the dropdown
        // eslint-disable-next-line security/detect-object-injection
        (entry) => LOG_LEVELS[entry.level] >= LOG_LEVELS[level]
      ),
    [level, entries]
  );

  const lastTimestamp = useMemo(
    () => Math.max(...entries.map((x) => Number(x.timestamp))),
    [entries]
  );

  const [pageEntries, numPages] = useMemo(() => {
    const start = page * perPage;
    const pageEntries = filteredEntries.slice(start, start + perPage);
    return [pageEntries, Math.ceil(filteredEntries.length / perPage)];
  }, [perPage, page, filteredEntries]);

  const checkingNewEntriesRef = useRef(false);
  const checkNewEntries = useCallback(async () => {
    if (!initialized || checkingNewEntriesRef.current) {
      // Wait for the initial set of logs or the previous check to complete
      // before running another check for updates
      return;
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps -- we can neglect the loss of the value on re-render for the sake of simplicity
    checkingNewEntriesRef.current = true;

    const newEntries = await getLog(context);
    const filteredNewEntries = (newEntries ?? []).filter(
      // eslint-disable-next-line security/detect-object-injection -- level is from dropdown
      (x) => LOG_LEVELS[x.level] >= LOG_LEVELS[level]
    );
    setUnread(newEntries.filter((x) => Number(x.timestamp) > lastTimestamp));
    setNumNew(Math.max(0, filteredNewEntries.length - filteredEntries.length));
    checkingNewEntriesRef.current = false;
  }, [
    lastTimestamp,
    setUnread,
    context,
    filteredEntries,
    level,
    setNumNew,
    initialized,
  ]);

  const clear = useCallback(async () => clearLog(context), [context]);

  useEffect(() => {
    if (refreshInterval) {
      const interval = setInterval(checkNewEntries, refreshInterval);
      return () => {
        clearInterval(interval);
      };
    }
  }, [checkNewEntries, refreshInterval, entries, level]);

  return {
    numNew,
    isLoading,
    pageEntries,
    hasEntries: entries?.length > 0,
    numPages,
    refresh,
    clear,
  };
}
