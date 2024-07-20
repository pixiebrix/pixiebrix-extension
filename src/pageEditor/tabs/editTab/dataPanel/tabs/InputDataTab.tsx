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
import DataTab from "@/pageEditor/tabs/editTab/dataPanel/DataTab";
import React, { useMemo } from "react";
import { type TraceRecord } from "@/telemetry/trace";
import { type Nullishable } from "@/utils/nullishUtils";
import { FormCheck } from "react-bootstrap";
import { isEmpty, pickBy } from "lodash";
import ErrorDisplay from "@/pageEditor/tabs/editTab/dataPanel/ErrorDisplay";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/pageEditor/store/editor/pageEditorTypes";
import { selectNodeDataPanelTabState } from "@/pageEditor/store/editor/editorSelectors";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import { type ValueOf } from "type-fest";
import styles from "./InputDataTab.module.scss";
import FieldTemplate from "@/components/form/FieldTemplate";
import PopoverInfoLabel from "@/components/form/popoverInfoLabel/PopoverInfoLabel";

const InputViewModes = {
  Arguments: "arguments",
  Variables: "variables",
} as const;

type ViewMode = ValueOf<typeof InputViewModes>;

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
            An error occurred evaluating input configuration, but the brick was
            skipped because condition was not met
          </Alert>
        ) : (
          <Alert variant="danger">Error evaluating input configuration</Alert>
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

const ViewModeRadio: React.FunctionComponent<{
  label: React.ReactNode;
  viewMode: ViewMode;
  isChecked: boolean;
  onSelect: () => void;
}> = ({ viewMode, isChecked, onSelect, label }) => (
  <FormCheck
    id={`inputViewMode-${viewMode}`}
    name="inputViewMode"
    label={label}
    type="radio"
    value={viewMode}
    checked={isChecked}
    onChange={() => {
      onSelect();
    }}
  />
);

const ViewModeWidget: React.FunctionComponent = () => {
  const dispatch = useDispatch();

  const { viewMode = InputViewModes.Arguments } =
    useSelector((state: RootState) =>
      selectNodeDataPanelTabState(state, DataPanelTabKey.Input),
    ) ?? {};

  const setViewMode = (nextViewMode: string) => {
    dispatch(
      actions.setNodeDataPanelTabViewMode({
        tabKey: DataPanelTabKey.Input,
        viewMode: nextViewMode,
      }),
    );
  };

  return (
    <div className={styles.viewToggle}>
      <ViewModeRadio
        viewMode={InputViewModes.Arguments}
        isChecked={viewMode === InputViewModes.Arguments}
        onSelect={() => {
          setViewMode(InputViewModes.Arguments);
        }}
        label={
          <span>
            <PopoverInfoLabel
              name="arguments"
              label="Arguments"
              description="Arguments passed to the brick on the latest run"
            />
          </span>
        }
      />
      <ViewModeRadio
        viewMode={InputViewModes.Variables}
        isChecked={viewMode === InputViewModes.Variables}
        onSelect={() => {
          setViewMode(InputViewModes.Variables);
        }}
        label={
          <span>
            <PopoverInfoLabel
              name={InputViewModes.Variables}
              label="Variables"
              description="Variables available to brick configuration on the latest run"
            />
          </span>
        }
      />
    </div>
  );
};

/**
 * Data Panel tab displaying input arguments and variables.
 * @since 2.0.6 includes both arguments and variables in a single panel
 */
const InputDataTab: React.FunctionComponent<{
  traceRecord: Nullishable<TraceRecord>;
  isInputStale: boolean;
}> = ({ isInputStale, traceRecord }) => {
  const { viewMode = InputViewModes.Arguments } =
    useSelector((state: RootState) =>
      selectNodeDataPanelTabState(state, DataPanelTabKey.Input),
    ) ?? {};

  return (
    <DataTab eventKey={DataPanelTabKey.Input} isTraceEmpty={!traceRecord}>
      {isInputStale && (
        <Alert variant="warning">
          A previous brick has changed, input may be out of date
        </Alert>
      )}

      <FieldTemplate
        name="viewMode"
        label="View"
        fitLabelWidth
        as={ViewModeWidget}
      />

      {viewMode === InputViewModes.Arguments ? (
        <ArgumentsBody traceRecord={traceRecord} />
      ) : (
        <VariablesBody traceRecord={traceRecord} />
      )}
    </DataTab>
  );
};

export default InputDataTab;
