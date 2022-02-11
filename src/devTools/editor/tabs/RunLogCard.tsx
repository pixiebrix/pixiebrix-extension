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

import React, { useContext, useState } from "react";
import { MessageLevel } from "@/background/logging";
import LogTable from "@/components/logViewer/LogTable";
import LogToolbar from "@/components/logViewer/LogToolbar";
import useLogEntriesView from "@/components/logViewer/useLogEntriesView";
import { Card } from "react-bootstrap";
import { GridLoader } from "react-spinners";
import { LogContext2 } from "@/components/logViewer/Logs";

type OwnProps = {
  initialLevel?: MessageLevel;
  perPage?: number;
};

const RunLogCard: React.FunctionComponent<OwnProps> = ({
  initialLevel = "info",
  perPage = 10,
}) => {
  const [level, setLevel] = useState<MessageLevel>(initialLevel);
  const [page, setPage] = useState(0);

  const { isLoading, refreshDisplayedEntries, clearAllEntries } = useContext(
    LogContext2
  );

  const logs = useLogEntriesView({
    level,
    page,
    perPage,
  });

  console.log("RunLogCard", "render", logs);

  if (isLoading) {
    return (
      <Card.Body>
        <GridLoader />
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
        refresh={refreshDisplayedEntries}
        clear={clearAllEntries}
      />
      <LogTable pageEntries={logs.pageEntries} hasEntries={logs.hasEntries} />
    </>
  );
};

export default RunLogCard;
