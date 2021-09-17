/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import React from "react";
import { UUID } from "@/core";
import GridLoader from "react-spinners/GridLoader";
import { getErrorMessage } from "@/errors";
import JsonTree from "@/components/JsonTree";
import { Tab, Tabs } from "react-bootstrap";
import styles from "./TraceView.module.scss";
import useInterval from "@/hooks/useInterval";
import { useLatestTraceRecord } from "@/devTools/editor/tabs/editTab/TraceView";

const FoundationTraceView: React.FunctionComponent<{
  instanceId: UUID;
  traceReloadMillis?: number;
}> = ({ instanceId, traceReloadMillis = 750 }) => {
  const [record, isLoading, error, recalculate] = useLatestTraceRecord(
    instanceId
  );

  useInterval(recalculate, traceReloadMillis);

  if (!instanceId) {
    return (
      <div className="text-muted">
        Add a brick and run the extension to view the output
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <GridLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-danger">
        Error loading trace: {getErrorMessage(error)}
      </div>
    );
  }

  if (!record) {
    return (
      <div className="text-muted">
        No trace available, run the extension to generate data
      </div>
    );
  }

  return (
    <Tabs defaultActiveKey="output">
      <Tab eventKey="output" title="Output" tabClassName={styles.tab}>
        {"templateContext" in record && (
          <>
            <JsonTree data={{ "@input": record.templateContext["@input"] }} />
          </>
        )}
      </Tab>
    </Tabs>
  );
};

export default FoundationTraceView;
