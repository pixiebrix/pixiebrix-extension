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

import { LogEntry, LOG_LEVELS, MessageLevel } from "@/background/logging";
import { useContext, useEffect, useMemo, useState } from "react";
import { LogContext2 } from "./Logs";

type config = {
  level: MessageLevel;
  page: number;
  perPage: number;
};

function useLogEntries2({ level, page, perPage }: config) {
  const {
    entries: allEntries,
    messageContext,
    clear: clearAllEntries,
  } = useContext(LogContext2);
  const [entries, setEntries] = useState<LogEntry[]>([]);

  // Set the initial entries when context changes
  useEffect(() => {
    setEntries(allEntries);
  }, [messageContext]);

  // TODO - newEntries come directly from getLog, always new object, no reason for useMemo
  const filteredAllEntries = useMemo(
    () =>
      allEntries.filter(
        // eslint-disable-next-line security/detect-object-injection -- level is coming from the dropdown
        (entry) => LOG_LEVELS[entry.level] >= LOG_LEVELS[level]
      ),
    [level, allEntries]
  );

  const filteredEntries = useMemo(
    () =>
      (entries ?? []).filter(
        // Level is coming from the dropdown
        // eslint-disable-next-line security/detect-object-injection
        (entry) => LOG_LEVELS[entry.level] >= LOG_LEVELS[level]
      ),
    [level, entries]
  );

  const numNew = filteredAllEntries.length - filteredEntries.length;

  const hasEntries = allEntries.length > 0;

  const start = page * perPage;
  const pageEntries = filteredEntries.slice(start, start + perPage);

  const numPages = Math.ceil(filteredEntries.length / perPage);

  const refresh = async () => {
    setEntries(allEntries);
    const value = Promise.resolve();
    return value;
  };

  const clear = async () => {
    setEntries([]);
    return clearAllEntries();
  };

  return {
    isLoading: false,
    numNew,
    hasEntries,
    pageEntries,
    numPages,
    refresh,
    clear,
  };
}

export default useLogEntries2;
