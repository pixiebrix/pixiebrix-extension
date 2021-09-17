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
import { getByInstanceId } from "@/telemetry/trace";
import { useAsyncState } from "@/hooks/common";
import { UUID } from "@/core";
import { sortBy } from "lodash";
import GridLoader from "react-spinners/GridLoader";
import { getErrorMessage } from "@/errors";
import PlainJsonTree from "@/components/JsonTree";
import { Tab, Tabs } from "react-bootstrap";
import styles from "./TraceView.module.scss";
import ErrorBoundary from "@/components/ErrorBoundary";
import PreviewView from "@/devTools/editor/tabs/effect/PreviewView";
import { FastField, FieldInputProps } from "formik";
import { BlockConfig } from "@/blocks/types";
import { useLabelRenderer } from "@/devTools/editor/tabs/reader/hooks";
import useInterval from "@/hooks/useInterval";
import { jsonTreeTheme as theme } from "@/themes/light";
import JSONTree from "react-json-tree";

export function useLatestTraceRecord(instanceId: UUID) {
  return useAsyncState(async () => {
    if (instanceId == null) {
      throw new Error("No instance id found");
    }

    const records = await getByInstanceId(instanceId);
    return sortBy(records, (x) => new Date(x.timestamp)).reverse()[0];
  }, [instanceId]);
}

const TraceView: React.FunctionComponent<{
  blockFieldName: string;
  instanceId: UUID;
  traceReloadMillis?: number;
}> = ({ blockFieldName, instanceId, traceReloadMillis = 750 }) => {
  const [record, isLoading, error, recalculate] = useLatestTraceRecord(
    instanceId
  );

  useInterval(recalculate, traceReloadMillis);

  const dataLabelRenderer = useLabelRenderer();

  const jsonTree = (data: unknown) => (
    <JSONTree
      data={data}
      labelRenderer={dataLabelRenderer}
      theme={theme}
      invertTheme
      hideRoot
    />
  );

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
      <Tab eventKey="context" title="Context" tabClassName={styles.tab}>
        {jsonTree(record.templateContext)}
      </Tab>
      <Tab eventKey="rendered" title="Rendered Input" tabClassName={styles.tab}>
        {jsonTree(record.renderedArgs)}
      </Tab>
      <Tab eventKey="output" title="Output" tabClassName={styles.tab}>
        {"output" in record && (
          <>
            <span>Data</span>
            {jsonTree(record.output)}
          </>
        )}

        {"error" in record && (
          <>
            <span className="text-danger">Error</span>
            <PlainJsonTree data={record.error} />
          </>
        )}
      </Tab>
      <Tab
        eventKey="preview"
        title="Preview"
        tabClassName={styles.tab}
        // Only mount if the user is viewing it, because output previews take up resources to run
        mountOnEnter
        unmountOnExit
      >
        <ErrorBoundary>
          <FastField name={blockFieldName}>
            {({ field }: { field: FieldInputProps<BlockConfig> }) => (
              <PreviewView traceRecord={record} blockConfig={field.value} />
            )}
          </FastField>
        </ErrorBoundary>
      </Tab>
    </Tabs>
  );
};

export default TraceView;
