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

import React, { useState, createContext } from "react";
import { LogEntry } from "@/background/logging";
import usePollContextLogs from "./usePollContextLogs";
import { MessageContext } from "@/core";

type LogState = {
  messageContext: MessageContext;
  entries: LogEntry[];
};

const defaultState: LogState = {
  messageContext: null,
  entries: [],
};

export const LogContext2 = createContext<LogState>(defaultState);

type ContextLogsProps = {
  messageContext: MessageContext;
};

export const ContextLogs: React.FunctionComponent<ContextLogsProps> = ({
  messageContext,
  children,
}) => {
  const entries = usePollContextLogs({ context: messageContext });
  return (
    <LogContext2.Provider value={{ messageContext, entries }}>
      {children}
    </LogContext2.Provider>
  );
};
