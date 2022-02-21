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

import { LogEntry } from "@/background/logging";
import { connect } from "react-redux";
import { logActions } from "./logSlice";
import { LogRootState } from "./logViewerTypes";

export type ConnectedProps = {
  isLoading: boolean;
  availableEntries: LogEntry[];
  entries: LogEntry[];
  refreshEntries: () => void;
  clearAvailableEntries: () => void;
};

const mapStateToProps = ({ logs }: LogRootState) => ({
  isLoading: logs.isLoading,
  availableEntries: logs.availableEntries,
  entries: logs.entries,
});

const mapDispatchToProps = {
  refreshEntries: logActions.refreshEntries,
  clearAvailableEntries: logActions.clear,
};

export const connectLogCard = connect(mapStateToProps, mapDispatchToProps);
