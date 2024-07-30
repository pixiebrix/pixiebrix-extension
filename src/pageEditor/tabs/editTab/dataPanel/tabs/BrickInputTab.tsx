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

import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import Alert from "@/components/Alert";
import DataTabJsonTree from "@/pageEditor/tabs/editTab/dataPanel/DataTabJsonTree";
import { contextAsPlainObject } from "@/runtime/extendModVariableContext";
import DataTabPane from "@/pageEditor/tabs/editTab/dataPanel/DataTabPane";
import React, { useMemo } from "react";
import { type TraceRecord } from "@/telemetry/trace";
import { type Nullishable } from "@/utils/nullishUtils";
import { isEmpty, pickBy } from "lodash";
import ErrorDisplay from "@/pageEditor/tabs/editTab/dataPanel/ErrorDisplay";
import { useSelector } from "react-redux";
import type { RootState } from "@/pageEditor/store/editor/pageEditorTypes";
import { selectNodeDataPanelTabState } from "@/pageEditor/store/editor/editorSelectors";
import ViewModeField, {
  type ViewModeOption,
} from "@/pageEditor/tabs/editTab/dataPanel/tabs/ViewModeField";
import useBrickTraceRecord from "@/pageEditor/tabs/editTab/dataPanel/tabs/useBrickTraceRecord";
import { type ValueOf } from "type-fest";

const InputViewModes = {
  Arguments: "arguments",
  Variables: "variables",
} as const;

const VIEW_MODE_OPTIONS: Array<ViewModeOption<ValueOf<typeof InputViewModes>>> =
  [
    {
      value: InputViewModes.Arguments,
      label: "Arguments",
      description: "Arguments passed to the brick on the latest run",
    },
    {
      value: InputViewModes.Variables,
      label: "Variables",
      description:
        "Variables available to brick configuration on the latest run",
    },
  ];

/**
 * Exclude irrelevant top-level keys in the context passed to the brick.
 */
const contextFilter = (value: unknown, key: string): boolean => {
  // `@options` comes from marketplace-activated mod components. There's a chance the user might add a brick that has
  // @options as an output key. In that case, we'd expect values to flow into it. So just checking to see if there's
  // any data is a good compromise even though we miss the corner-case where @options is user-defined but empty
  if (key === "@options" && isEmpty(value)) {
    return false;
  }

  // At one point, we also excluded keys that weren't prefixed with "@" as a stop-gap for encouraging the use of output
  // keys. With the introduction of ApiVersion v2, we removed that filter
  return true;
};

const noTraceAvailableElement = (
  <div className="text-muted">
    No runs available. Run the brick to view input
  </div>
);

/**
 * All variables available to the brick, even if the brick didn't run or there was an error rendering the arguments.
 */
const VariablesBody: React.FunctionComponent<{
  traceRecord: Nullishable<TraceRecord>;
}> = ({ traceRecord }) => {
  const relevantContext = useMemo(
    () => pickBy(traceRecord?.templateContext ?? {}, contextFilter),
    [traceRecord?.templateContext],
  );

  return (
    <DataTabJsonTree
      data={contextAsPlainObject(relevantContext)}
      copyable
      searchable
      tabKey={DataPanelTabKey.Input}
      label="Variables"
    />
  );
};

const ArgumentsBody: React.FunctionComponent<{
  traceRecord: Nullishable<TraceRecord>;
}> = ({ traceRecord }) => {
  if (traceRecord?.renderError) {
    return (
      <>
        {traceRecord.skippedRun ? (
          <Alert variant="info">
            An error occurred evaluating the brick arguments, but the brick was
            skipped because condition was not met
          </Alert>
        ) : (
          <Alert variant="danger">Error evaluating brick arguments</Alert>
        )}
        <ErrorDisplay error={traceRecord.renderError} />
      </>
    );
  }

  return (
    <DataTabJsonTree
      data={traceRecord?.renderedArgs}
      copyable
      searchable
      tabKey={DataPanelTabKey.Input}
      label="Arguments"
    />
  );
};

/**
 * Data Panel tab displaying input arguments and variables.
 * @since 2.0.7 includes both arguments and variables in a single panel
 */
const BrickInputTab: React.FunctionComponent = () => {
  const { isInputStale, traceRecord } = useBrickTraceRecord();

  const { viewMode: selectedViewMode } =
    useSelector((state: RootState) =>
      selectNodeDataPanelTabState(state, DataPanelTabKey.Input),
    ) ?? {};

  const viewMode = selectedViewMode ?? InputViewModes.Arguments;

  if (!traceRecord) {
    return (
      <DataTabPane eventKey={DataPanelTabKey.Input}>
        {noTraceAvailableElement}
      </DataTabPane>
    );
  }

  return (
    <DataTabPane eventKey={DataPanelTabKey.Input}>
      {isInputStale && (
        <Alert variant="warning">
          A prior brick has changed, input may be out of date
        </Alert>
      )}

      <ViewModeField
        name="viewMode"
        viewModeOptions={VIEW_MODE_OPTIONS}
        defaultValue={viewMode}
        tabKey={DataPanelTabKey.Input}
      />

      {viewMode === InputViewModes.Arguments ? (
        <ArgumentsBody traceRecord={traceRecord} />
      ) : (
        <VariablesBody traceRecord={traceRecord} />
      )}
    </DataTabPane>
  );
};

export default BrickInputTab;
