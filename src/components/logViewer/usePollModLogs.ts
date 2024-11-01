/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { useEffect } from "react";
import {
  logActions,
  type LogDispatch,
  stopPollLogs,
} from "@/components/logViewer/logSlice";
import { useDispatch } from "react-redux";

/**
 * Polls the mod logs for new entries for the active mod context.
 * Should be included once at the top of the App React tree.
 */
function usePollModLogs(): void {
  const dispatch = useDispatch<LogDispatch>();

  useEffect(() => {
    // Start polling logs
    void dispatch(logActions.pollLogs());

    return () => {
      stopPollLogs();
    };
  }, [dispatch]);
}

export default usePollModLogs;
