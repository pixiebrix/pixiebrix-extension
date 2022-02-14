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
import { clearLog, LogEntry } from "@/background/logging";
import usePollContextLogs from "./usePollContextLogs";
import { MessageContext } from "@/core";

type LogState = {
  messageContext: MessageContext;
  allEntries: LogEntry[];
  displayedEntries: LogEntry[];
  isLoading: boolean;
  refreshDisplayedEntries: () => void;
  clearAllEntries: () => Promise<void>;
};

const defaultState: LogState = {
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
  const [displayedEntries, setDisplayedEntries] = useState<LogEntry[]>([]);
  const { entries: allEntries, isLoading } = usePollContextLogs({
    context: messageContext,
  });

  // Initialize displayed entries when the loading state changes
  useEffect(() => {
    setDisplayedEntries(allEntries);
  }, [isLoading]);

  const refreshDisplayedEntries = () => {
    setDisplayedEntries(allEntries);
  };

  const clearAllEntries = async () => clearLog(messageContext);

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
