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
import { MessageLevel } from "@/background/logging";
import Loader from "@/components/Loader";
import { Card } from "react-bootstrap";
import { MessageContext } from "@/core";
import LogTable from "@/components/logViewer/LogTable";
import useLogEntries from "@/components/logViewer/useLogEntries";
import LogToolbar from "@/components/logViewer/LogToolbar";

const BrickLogs: React.FunctionComponent<{
  initialLevel?: MessageLevel;
  context: MessageContext;
  perPage?: number;
  refreshInterval?: number;
}> = ({ context, initialLevel = "debug", perPage = 10, refreshInterval }) => {
  const [level, setLevel] = useState(initialLevel);
  const [page, setPage] = useState(0);

  const logs = useLogEntries({
    context,
    perPage,
    refreshInterval,
    level,
    page,
  });

  if (logs.isLoading) {
    return (
      <Card.Body>
        <Loader />
      </Card.Body>
    );
  }

  return (
    <>
      <LogToolbar
        setLevel={setLevel}
        level={level}
        page={page}
        setPage={setPage}
        {...logs}
      />
      <LogTable {...logs} />
    </>
  );
};

export default BrickLogs;
