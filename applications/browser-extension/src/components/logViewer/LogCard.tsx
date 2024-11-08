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

import React, { useState } from "react";
import { type MessageLevel } from "../../telemetry/logging";
import Loader from "../Loader";
import { Card } from "react-bootstrap";
import LogTable from "./LogTable";
import LogToolbar from "./LogToolbar";
import useLogEntriesView from "./useLogEntriesView";
import { useDispatch, useSelector } from "react-redux";
import { selectLogs } from "./logSelectors";
import { logActions } from "./logSlice";
import { ErrorDisplay } from "../../layout/ErrorDisplay";
import { type AppDispatch } from "../../extensionConsole/store";

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

  const { isLoading, isError, error } = useSelector(selectLogs);
  const dispatch = useDispatch<AppDispatch>();
  const refreshEntries = () => dispatch(logActions.refreshEntries());
  const clearAvailableEntries = async () => {
    await dispatch(logActions.clear());
  };

  const logs = useLogEntriesView({ level, page, perPage });

  if (isError) {
    return (
      <Card.Body>
        <ErrorDisplay error={error} />
      </Card.Body>
    );
  }

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
