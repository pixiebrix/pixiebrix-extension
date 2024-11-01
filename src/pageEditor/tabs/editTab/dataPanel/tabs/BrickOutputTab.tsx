import DataTabPane from "@/pageEditor/tabs/editTab/dataPanel/DataTabPane";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import Alert from "@/components/Alert";
import { BrickTypes } from "@/runtime/runtimeTypes";
import DataTabJsonTree from "@/pageEditor/tabs/editTab/dataPanel/DataTabJsonTree";
import ErrorDisplay from "@/pageEditor/tabs/editTab/dataPanel/ErrorDisplay";
import React from "react";
import type { ValueOf } from "type-fest";
import BrickPreview, {
  usePreviewInfo,
} from "@/pageEditor/tabs/effect/BrickPreview";
import { useSelector } from "react-redux";
import {
  selectActiveModComponentFormState,
  selectActiveNodeInfo,
  selectNodeDataPanelTabState,
} from "@/pageEditor/store/editor/editorSelectors";
import useTypedBrickMap from "@/bricks/hooks/useTypedBrickMap";
import ViewModeField, {
  type ViewModeOption,
} from "@/pageEditor/tabs/editTab/dataPanel/tabs/ViewModeField";
import useBrickTraceRecord from "@/pageEditor/tabs/editTab/dataPanel/tabs/useBrickTraceRecord";
import type { RootState } from "@/pageEditor/store/editor/pageEditorTypes";
import ErrorBoundary from "@/components/ErrorBoundary";
import { isTraceError } from "@/telemetry/trace";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { assertNotNullish } from "@/utils/nullishUtils";

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
    description: "Actual output returned by the brick on the latest run",
  },
  {
    value: OutputViewModes.Preview,
    label: "Live Preview",
    description:
      "Output preview generated with the current configuration and the input variables from the latest run",
  },
];

/**
 * Content for showing the actual output from the brick for the latest trace.
 */
const OutputActualBody: React.FC = () => {
  const { blockId: brickId } = useSelector(selectActiveNodeInfo);
  const { data: previewInfo } = usePreviewInfo(brickId);
  const { isStale, traceRecord } = useBrickTraceRecord();

  if (traceRecord == null) {
    return (
      <>
        <div className="text-muted">
          No runs available. Run the brick to view output
        </div>

        {previewInfo?.traceOptional && (
          <div className="text-info mt-2">
            <FontAwesomeIcon icon={faInfoCircle} />
            &nbsp;This brick supports live preview without running the brick.
            Select Live Preview to view the preview
          </div>
        )}
      </>
    );
  }

  if (traceRecord.skippedRun) {
    return (
      <Alert variant="info">
        The brick did not run because its condition was not met
      </Alert>
    );
  }

  if (isTraceError(traceRecord)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- isTraceError type guard
    return <ErrorDisplay error={traceRecord.error!} />;
  }

  // Extract the output from the trace record
  const outputObj: unknown =
    "output" in traceRecord
      ? "outputKey" in traceRecord
        ? { [`@${traceRecord.outputKey}`]: traceRecord.output }
        : traceRecord.output
      : null;

  return (
    <>
      {isStale && (
        <Alert variant="warning">
          This or a preceding brick has changed, output may be out of date
        </Alert>
      )}
      <DataTabJsonTree
        data={outputObj}
        copyable
        searchable
        tabKey={DataPanelTabKey.Output}
        label="Latest Run"
      />
    </>
  );
};

const OutputPreviewBody: React.FC = () => {
  const { blockConfig: brickConfig } = useSelector(selectActiveNodeInfo);

  return (
    <>
      {brickConfig.if != null && (
        <Alert variant="info">
          This brick has a condition. It will not execute if the condition is
          not met
        </Alert>
      )}
      <ErrorBoundary>
        <BrickPreview />
      </ErrorBoundary>
    </>
  );
};

const BrickOutputTab: React.FC = () => {
  const { viewMode: selectedViewMode } =
    useSelector((state: RootState) =>
      selectNodeDataPanelTabState(state, DataPanelTabKey.Output),
    ) ?? {};

  const { blockId: brickId } = useSelector(selectActiveNodeInfo);
  const { data: previewInfo } = usePreviewInfo(brickId);
  const { traceRecord } = useBrickTraceRecord();

  const defaultViewMode =
    traceRecord == null && previewInfo?.traceOptional
      ? OutputViewModes.Preview
      : OutputViewModes.Actual;

  const viewMode = selectedViewMode ?? defaultViewMode;

  const { data: allBricks } = useTypedBrickMap();
  const { type: brickType } = allBricks?.get(brickId) ?? {};

  if (brickType === BrickTypes.RENDERER || brickType === BrickTypes.EFFECT) {
    return (
      <DataTabPane eventKey={DataPanelTabKey.Output}>
        <span className="text-muted">
          This brick does not return an output variable
        </span>
      </DataTabPane>
    );
  }

  return (
    <DataTabPane eventKey={DataPanelTabKey.Output}>
      <ViewModeField
        name="viewMode"
        viewModeOptions={VIEW_MODE_OPTIONS}
        defaultValue={defaultViewMode}
        tabKey={DataPanelTabKey.Output}
      />

      {viewMode === OutputViewModes.Actual ? (
        <OutputActualBody />
      ) : (
        <OutputPreviewBody />
      )}
    </DataTabPane>
  );
};

export default BrickOutputTab;
