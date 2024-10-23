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

import React from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/pageEditor/store/editor/pageEditorTypes";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import DataTabPane from "@/pageEditor/tabs/editTab/dataPanel/DataTabPane";
import ViewModeField, {
  type ViewModeOption,
} from "@/pageEditor/tabs/editTab/dataPanel/tabs/ViewModeField";
import type { ValueOf } from "type-fest";
import { makeSelectBrickTrace } from "@/pageEditor/store/runtime/runtimeSelectors";
import DataTabJsonTree from "@/pageEditor/tabs/editTab/dataPanel/DataTabJsonTree";
import StarterBrickPreview from "@/pageEditor/tabs/effect/StarterBrickPreview";
import { assertNotNullish } from "@/utils/nullishUtils";
import { type TraceRecord } from "@/telemetry/trace";
import {
  selectActiveModComponentFormState,
  selectNodeDataPanelTabState,
} from "@/pageEditor/store/editor/editorSelectors";

const OutputViewModes = {
  Actual: "actual",
  Preview: "preview",
} as const;

const VIEW_MODE_OPTIONS: Array<
  ViewModeOption<ValueOf<typeof OutputViewModes>>
> = [
  {
    value: OutputViewModes.Actual,
    label: "Latest Run",
    description: "Actual variables produced on the latest run",
  },
  {
    value: OutputViewModes.Preview,
    label: "Live Preview",
    description: "Preview produced with the current configuration",
  },
];

function useStarterBrickTraceRecord(): TraceRecord | undefined {
  const modComponentFormState = useSelector(selectActiveModComponentFormState);

  assertNotNullish(
    modComponentFormState,
    "Starter Brick Output Tab requires an active mod component",
  );

  const {
    modComponent: { brickPipeline },
  } = modComponentFormState;

  const firstBrickInstanceId = brickPipeline[0]?.instanceId;

  const { record } = useSelector(makeSelectBrickTrace(firstBrickInstanceId));

  return record;
}

const OutputActualBody: React.FC = () => {
  const modComponentFormState = useSelector(selectActiveModComponentFormState);

  assertNotNullish(
    modComponentFormState,
    "Starter Brick Output Tab requires an active mod component",
  );

  const {
    modComponent: { brickPipeline },
  } = modComponentFormState;

  const firstBrickTraceRecord = useStarterBrickTraceRecord();

  if (firstBrickTraceRecord) {
    return (
      <DataTabJsonTree
        data={firstBrickTraceRecord.templateContext}
        copyable
        searchable
        tabKey={DataPanelTabKey.Output}
        label="Latest Run"
      />
    );
  }

  if (brickPipeline.length > 0) {
    return (
      <div className="text-muted">
        No runs available. Run the Starter Brick to view output
      </div>
    );
  }

  return (
    <div className="text-muted">
      No runs available. Add a brick and run the Starter Brick to view the
      latest output
    </div>
  );
};

const StarterBrickOutputTab: React.FC = () => {
  const firstBrickTraceRecord = useStarterBrickTraceRecord();

  const { viewMode: selectedViewMode } =
    useSelector((state: RootState) =>
      selectNodeDataPanelTabState(state, DataPanelTabKey.Output),
    ) ?? {};

  // Default to preview if there's no runs available
  const defaultViewMode = firstBrickTraceRecord
    ? OutputViewModes.Actual
    : OutputViewModes.Preview;

  const viewMode = selectedViewMode ?? defaultViewMode;

  return (
    <DataTabPane eventKey={DataPanelTabKey.Output}>
      <ViewModeField
        name="viewMode"
        viewModeOptions={VIEW_MODE_OPTIONS}
        defaultValue={OutputViewModes.Actual}
        tabKey={DataPanelTabKey.Output}
      />

      {viewMode === OutputViewModes.Actual ? (
        <OutputActualBody />
      ) : (
        <StarterBrickPreview />
      )}
    </DataTabPane>
  );
};

export default StarterBrickOutputTab;
