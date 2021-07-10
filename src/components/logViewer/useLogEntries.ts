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

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  clearLog,
  getLog,
  LOG_LEVELS,
  LogEntry,
  MessageLevel,
} from "@/background/logging";
import useAsyncEffect from "use-async-effect";
import { MessageContext } from "@/core";

type Options = {
  context: MessageContext;
  level: MessageLevel;
  page: number;
  perPage: number;
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
  const [numNew, setNumNew] = useState<number>(0);

  const [{ entries, isLoading }, setLogState] = useState<{
    entries: LogEntry[];
    isLoading: boolean;
  }>({ entries: [], isLoading: true });

  const refresh = useCallback(
    async (isMounted: () => boolean = () => true) => {
      setLogState({ entries: [], isLoading: true });
      const entries = await getLog(context);
      if (!isMounted()) {
        return;
      }
      setLogState({ entries, isLoading: false });
      setNumNew(0);
    },
    [context]
  );

  useAsyncEffect(
    async (isMounted) => {
      await refresh(isMounted);
    },
    [refresh]
  );

  const filteredEntries = useMemo(
    () =>
      (entries ?? []).filter(
        // level is coming from the dropdown
        // eslint-disable-next-line security/detect-object-injection
        (entry) => LOG_LEVELS[entry.level] >= LOG_LEVELS[level]
      ),
    [level, entries]
  );

  const [pageEntries, numPages] = useMemo(() => {
    const start = page * perPage;
    const pageEntries = filteredEntries.slice(start, start + perPage);
    return [pageEntries, Math.ceil(filteredEntries.length / perPage)];
  }, [perPage, page, filteredEntries]);

  const checkNewEntries = useCallback(async () => {
    const newEntries = await getLog(context);
    const filteredNewEntries = (newEntries ?? []).filter(
      // eslint-disable-next-line security/detect-object-injection -- level is from dropdown
      (x) => LOG_LEVELS[x.level] >= LOG_LEVELS[level]
    );
    setNumNew(Math.max(0, filteredNewEntries.length - filteredEntries.length));
  }, [context, filteredEntries, level, setNumNew]);

  const clear = useCallback(async () => {
    return clearLog(context);
  }, [context]);

  useEffect(() => {
    if (refreshInterval) {
      const interval = setInterval(checkNewEntries, refreshInterval);
      return () => clearInterval(interval);
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
