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

import React, { useContext, useMemo, useState } from "react";
import { MessageLevel } from "@/background/logging";
import GridLoader from "react-spinners/GridLoader";
import { Card } from "react-bootstrap";
import LogTable from "@/components/logViewer/LogTable";
import useLogEntries from "@/components/logViewer/useLogEntries";
import LogToolbar from "@/components/logViewer/LogToolbar";
import useLogEntries2 from "@/components/logViewer/useLogEntries2";
import { LogContext2 } from "@/components/logViewer/Logs";

type OwnProps = {
  initialLevel?: MessageLevel;
  perPage?: number;
  refreshInterval?: number;
};

const RunLogCard: React.FunctionComponent<OwnProps> = ({
  initialLevel = "info",
  perPage = 10,
  refreshInterval,
}) => {
  const [level, setLevel] = useState<MessageLevel>(initialLevel);
  const [page, setPage] = useState(0);
  // TODO remove this
  const a = useContext(LogContext2);

  // TODO remove this
  const logs = useLogEntries({
    context: a.messageContext,
    perPage,
    refreshInterval,
    level,
    page,
  });

  const logs2 = useLogEntries2({
    level,
    page,
    perPage,
  });

  if (logs.isLoading) {
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
        numPages={logs2.numPages}
        hasEntries={logs.hasEntries}
        numNew={logs.numNew}
        refresh={logs.refresh}
        clear={logs.clear}
      />
      <LogTable pageEntries={logs2.pageEntries} hasEntries={logs.hasEntries} />
    </>
  );
};

export default RunLogCard;
