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

import React, { useState } from "react";
// eslint-disable-next-line import/no-restricted-paths -- Types only
import type { MessageLevel } from "@/background/logging";
import Loader from "@/components/Loader";
import { Card } from "react-bootstrap";
import LogTable from "@/components/logViewer/LogTable";
import LogToolbar from "@/components/logViewer/LogToolbar";
import useLogEntriesView from "@/components/logViewer/useLogEntriesView";
import { useDispatch, useSelector } from "react-redux";
import { selectLogs } from "./logSelectors";
import { logActions } from "./logSlice";

type OwnProps = {
  initialLevel?: MessageLevel;
  perPage?: number;
};

const LogCard: React.FunctionComponent<OwnProps> = ({
  initialLevel = "debug",
  perPage = 10,
}) => {
  const [level, setLevel] = useState<MessageLevel>(initialLevel);
  const [page, setPage] = useState(0);

  const { isLoading } = useSelector(selectLogs);
  const dispatch = useDispatch();
  const refreshEntries = () => dispatch(logActions.refreshEntries());
  const clearAvailableEntries = () => dispatch(logActions.clear());

  const logs = useLogEntriesView({ level, page, perPage });

  if (isLoading) {
    return (
      <Card.Body>
        <Loader />
      </Card.Body>
    );
  }

  return (
    <>
      <LogToolbar
        level={level}
        setLevel={setLevel}
        page={page}
        setPage={setPage}
        numPages={logs.numPages}
        hasEntries={logs.hasEntries}
        numNew={logs.numNew}
        refresh={refreshEntries}
        clear={clearAvailableEntries}
      />
      <LogTable pageEntries={logs.pageEntries} hasEntries={logs.hasEntries} />
    </>
  );
};

export default LogCard;
