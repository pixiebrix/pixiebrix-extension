import DataTabPane from "@/pageEditor/tabs/editTab/dataPanel/DataTabPane";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import Alert from "@/components/Alert";
import { BrickTypes } from "@/runtime/runtimeTypes";
import DataTabJsonTree from "@/pageEditor/tabs/editTab/dataPanel/DataTabJsonTree";
import ErrorDisplay from "@/pageEditor/tabs/editTab/dataPanel/ErrorDisplay";
import React from "react";
import type { JsonObject, ValueOf } from "type-fest";
import BrickPreview, {
  usePreviewInfo,
} from "@/pageEditor/tabs/effect/BrickPreview";
import { useSelector } from "react-redux";
import {
  selectActiveModComponentFormState,
  selectActiveNodeInfo,
  selectNodeDataPanelTabState,
} from "@/pageEditor/store/editor/editorSelectors";
import useAllBricks from "@/bricks/hooks/useAllBricks";
import ViewModeField, {
  type ViewModeOption,
} from "@/pageEditor/tabs/editTab/dataPanel/tabs/ViewModeField";
import useBrickTraceRecord from "@/pageEditor/tabs/editTab/dataPanel/tabs/useBrickTraceRecord";
import type { RootState } from "@/pageEditor/store/editor/pageEditorTypes";
import ErrorBoundary from "@/components/ErrorBoundary";
import { isTraceError } from "@/telemetry/trace";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";

const OutputViewModes = {
  Actual: "actual",
  Preview: "preview",
} as const;

const VIEW_MODE_OPTIONS: Array<
  ViewModeOption<ValueOf<typeof OutputViewModes>>
> = [
  {
    value: OutputViewModes.Actual,
    label: "Latest Output",
    description: "Actual output returned by the brick on the latest run",
  },
  {
    value: OutputViewModes.Preview,
    label: "Live Preview",
    description:
      "Output preview generated with the current brick configuration and the input variables from the latest run",
  },
];

/**
 * Content for showing the actual output from the brick for the latest trace.
 */
const OutputActualBody: React.FC = () => {
  const { blockId: brickId } = useSelector(selectActiveNodeInfo);

  const { data: previewInfo } = usePreviewInfo(brickId);
  const { isStale, traceRecord } = useBrickTraceRecord();

  // Extract the output from the trace record
  const outputObj: JsonObject =
    traceRecord !== undefined && "output" in traceRecord
      ? "outputKey" in traceRecord
        ? { [`@${traceRecord.outputKey}`]: traceRecord.output }
        : traceRecord.output
      : null;

  if (traceRecord == null) {
    return (
      <>
        <div className="text-muted">
          No trace available. Run the mod to generate data
        </div>

        {previewInfo?.traceOptional && (
          <div className="text-info mt-2">
            <FontAwesomeIcon icon={faInfoCircle} />
            &nbsp;This brick supports previews without running the mod. Select
            Preview view to see the current preview
          </div>
        )}
      </>
    );
  }

  if (traceRecord?.skippedRun) {
    return (
      <Alert variant="info">
        The brick did not run because its condition was not met
      </Alert>
    );
  }

  if (isTraceError(traceRecord)) {
    return <ErrorDisplay error={traceRecord.error} />;
  }

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
        label="Actual Output"
      />
    </>
  );
};

const OutputPreviewBody: React.FC = () => {
  const { traceRecord } = useBrickTraceRecord();
  const { starterBrick } = useSelector(selectActiveModComponentFormState);

  const { blockConfig: brickConfig } = useSelector(selectActiveNodeInfo);

  return (
    <>
      {/* The value of `brick.if` can be `false`, in which case we also need to show a warning that brick execution is conditional. */}
      {brickConfig?.if != null && (
        <Alert variant="info">
          This brick has a condition. It will not execute if the condition is
          not met
        </Alert>
      )}
      <ErrorBoundary>
        <BrickPreview
          traceRecord={traceRecord}
          brickConfig={brickConfig}
          starterBrick={starterBrick}
        />
      </ErrorBoundary>
    </>
  );
};

const BrickOutputTab: React.FC = () => {
  const { viewMode = OutputViewModes.Actual } =
    useSelector((state: RootState) =>
      selectNodeDataPanelTabState(state, DataPanelTabKey.Output),
    ) ?? {};

  const { blockId: brickId } = useSelector(selectActiveNodeInfo);

  const { allBricks } = useAllBricks();
  const brick = allBricks.get(brickId);
  const brickType = brick?.type;

  if (brickType === BrickTypes.RENDERER) {
    return (
      <DataTabPane eventKey={DataPanelTabKey.Output}>
        <Alert variant="info">
          Renderer brick output is not available in the Data Panel
        </Alert>
      </DataTabPane>
    );
  }

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
        <OutputPreviewBody />
      )}
    </DataTabPane>
  );
};

export default BrickOutputTab;
