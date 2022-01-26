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

import React, { useState, useMemo, useCallback, createContext } from "react";
import type { LogEntry } from "@/background/logging";
import { isEqual, noop } from "lodash";

type Refresh = () => Promise<void>;

const defaultRefresh = async () => {
  console.warn("No refresh handler set");
};

type LogContextShape = {
  unread: LogEntry[];
  setUnread: (unread: LogEntry[]) => void;
  refresh: Refresh;
  setRefresh: (refresh: Refresh) => void;
};

const defaultValue: LogContextShape = {
  unread: [],
  setUnread: noop,
  refresh: defaultRefresh,
  setRefresh: noop,
};

/**
 * @deprecated This component introduces an anti-pattern of returning `safeSetUnread` and `safeSetRefresh`. In the
 *  future, we should probably be using the Redux store here. Should be using Redux store here?
 */
const LogContext = createContext(defaultValue);

export const LogContextWrapper: React.FunctionComponent = ({ children }) => {
  const [unread, setUnread] = useState<LogEntry[]>([]);
  const [refresh, setRefresh] = useState<Refresh>(() => defaultRefresh);

  const safeSetUnread = useCallback(
    (newUnread: LogEntry[]) => {
      setUnread((prevState) => {
        const prevUUIDs = new Set(prevState.map((x) => x.uuid));
        const newUUIDs = new Set(newUnread.map((x) => x.uuid));
        // Maintain reference equality
        return isEqual(prevUUIDs, newUUIDs) ? prevState : newUnread;
      });
    },
    [setUnread]
  );

  const safeSetRefresh = useCallback(
    (refreshHandler: Refresh) => {
      console.debug("Setting log refresh reference");
      // Wrap setRefresh here to take in a method
      setRefresh((_prevState: Refresh) => refreshHandler);
    },
    [setRefresh]
  );

  const value = useMemo(() => {
    console.debug(
      "LogContext using noop refresh method: %s",
      refresh === defaultRefresh
    );
    return {
      unread,
      setUnread: safeSetUnread,
      refresh,
      setRefresh: safeSetRefresh,
    };
  }, [unread, safeSetUnread, safeSetRefresh, refresh]);

  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
};

export default LogContext;
