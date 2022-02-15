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

import React, { createContext, useEffect, useState } from "react";
import { clearLog, getLog, LogEntry } from "@/background/logging";
import { MessageContext } from "@/core";
import { isEqual } from "lodash";
import useInterval from "@/hooks/useInterval";

const REFRESH_INTERVAL = 750;

export type LogState = {
  messageContext: MessageContext;
  allEntries: LogEntry[];
  displayedEntries: LogEntry[];
  isLoading: boolean;
  refreshDisplayedEntries: () => void;
  clearAllEntries: () => Promise<void>;
};

export const defaultState: LogState = {
  messageContext: null,
  allEntries: [],
  displayedEntries: [],
  isLoading: true,
  refreshDisplayedEntries: () => {},
  clearAllEntries: async () => {},
};

export const LogContext = createContext<LogState>(defaultState);

type ContextLogsProps = {
  messageContext: MessageContext;
};

/**
 * Fetches the logs from storage and tracks the displayed entries.
 */
export const ContextLogs: React.FunctionComponent<ContextLogsProps> = ({
  messageContext,
  children,
}) => {
  const [allEntries, setAllEntries] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [displayedEntries, setDisplayedEntries] = useState<LogEntry[]>([]);

  useEffect(() => {
    setAllEntries([]);
    setDisplayedEntries([]);
    setIsLoading(true);
  }, [messageContext]);

  useInterval(async () => {
    if (messageContext !== null) {
      const logEntries = await getLog(messageContext);

      // Do deep equality check. On the log array of ~3k items it takes only a fraction of a ms.
      // Makes sense to spend some cycles here to save on re-rendering of the children.
      if (!isEqual(logEntries, allEntries)) {
        setAllEntries(logEntries);
      }
    }

    if (isLoading) {
      setIsLoading(false);

      // Initialize displayed entries when the loading is complete
      setDisplayedEntries(allEntries);
    }
  }, REFRESH_INTERVAL);

  const refreshDisplayedEntries = () => {
    setDisplayedEntries(allEntries);
  };

  const clearAllEntries = async () => {
    await clearLog(messageContext);
    setAllEntries([]);
    setDisplayedEntries([]);
  };

  return (
    <LogContext.Provider
      value={{
        messageContext,
        allEntries,
        displayedEntries,
        isLoading,
        refreshDisplayedEntries,
        clearAllEntries,
      }}
    >
      {children}
    </LogContext.Provider>
  );
};
