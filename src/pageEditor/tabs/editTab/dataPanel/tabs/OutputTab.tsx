import DataTabPane from "@/pageEditor/tabs/editTab/dataPanel/DataTabPane";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import Alert from "@/components/Alert";
import { BrickTypes } from "@/runtime/runtimeTypes";
import DataTabJsonTree from "@/pageEditor/tabs/editTab/dataPanel/DataTabJsonTree";
import ErrorDisplay from "@/pageEditor/tabs/editTab/dataPanel/ErrorDisplay";
import React, { useMemo } from "react";
import { isEqual } from "lodash";
import type { JsonObject, ValueOf } from "type-fest";
import BrickPreview, {
  usePreviewInfo,
} from "@/pageEditor/tabs/effect/BrickPreview";
import { useSelector } from "react-redux";
import {
  selectActiveNodeInfo,
  selectNodeDataPanelTabState,
} from "@/pageEditor/store/editor/editorSelectors";
import useAllBricks from "@/bricks/hooks/useAllBricks";
import ViewModeField, {
  ViewModeOption,
} from "@/pageEditor/tabs/editTab/dataPanel/tabs/ViewModeField";
import useInputTrace from "@/pageEditor/tabs/editTab/dataPanel/tabs/useInputTrace";
import type { RootState } from "@/pageEditor/store/editor/pageEditorTypes";
import ErrorBoundary from "@/components/ErrorBoundary";

const OutputViewModes = {
  Actual: "actual",
  Preview: "preview",
} as const;

const VIEW_MODE_OPTIONS: Array<
  ViewModeOption<ValueOf<typeof OutputViewModes>>
> = [
  {
    value: OutputViewModes.Actual,
    label: "Actual",
    description: "Output returned by the brick on the latest run",
  },
  {
    value: OutputViewModes.Preview,
    label: "Preview",
    description:
      "Output preview generated with the input variables from the latest run",
  },
];

/**
 * Content for showing the actual output from the brick for the latest trace.
 */
const OutputActualBody: React.FC = () => {
  const {
    blockId: brickId,
    blockConfig: brickConfig,
    path: brickPath,
  } = useSelector(selectActiveNodeInfo);

  const { isStale, traceRecord } = useInputTrace();

  const isCurrentStale = useMemo(() => {
    if (isStale) {
      return true;
    }

    if (traceRecord === undefined) {
      return false;
    }

    return !isEqual(traceRecord.brickConfig, brickConfig);
  }, [isStale, traceRecord, brickConfig]);

  const outputObj: JsonObject =
    traceRecord !== undefined && "output" in traceRecord
      ? "outputKey" in traceRecord
        ? { [`@${traceRecord.outputKey}`]: traceRecord.output }
        : traceRecord.output
      : null;

  return (
    <>
      {traceRecord?.skippedRun && (
        <Alert variant="info">
          The brick did not run because the condition was not met
        </Alert>
      )}
      {!traceRecord?.skippedRun &&
        outputObj == null &&
        brickType === BrickTypes.RENDERER && (
          <Alert variant="info">
            Renderer brick output is not available in Data Panel
          </Alert>
        )}
      {!traceRecord?.skippedRun && outputObj && (
        <>
          {isCurrentStale && (
            <Alert variant="warning">
              This or a previous brick has changed, output may be out of date
            </Alert>
          )}
          <DataTabJsonTree
            data={outputObj}
            copyable
            searchable
            tabKey={DataPanelTabKey.Output}
            label="Output Data"
          />
        </>
      )}
      {traceRecord && "error" in traceRecord && traceRecord.error && (
        <ErrorDisplay error={traceRecord.error} />
      )}
    </>
  );
};

const OutputPreviewBody: React.FC = () => {
  return (
    <>
      {/* The value of `brick.if` can be `false`, in which case we also need to show a warning that brick execution is conditional. */}
      {brickConfig?.if && (
        <Alert variant="info">
          This brick has a condition. The brick will not execute if the
          condition is not met
        </Alert>
      )}
      <ErrorBoundary>
        <BrickPreview
          traceRecord={record}
          brickConfig={brickConfig}
          starterBrick={activeModComponentFormState.starterBrick}
        />
      </ErrorBoundary>
      ) : (
      <div className="text-muted">Run the mod once to enable live preview</div>)
    </>
  );
};

const OutputTab: React.FC = () => {
  // TODO: handle empty trace
  // TODO: handle optional trace

  const { viewMode = OutputViewModes.Actual } =
    useSelector((state: RootState) =>
      selectNodeDataPanelTabState(state, DataPanelTabKey.Output),
    ) ?? {};

  const {
    blockId: brickId,
    blockConfig: brickConfig,
    path: brickPath,
  } = useSelector(selectActiveNodeInfo);

  const { allBricks } = useAllBricks();
  const brick = allBricks.get(brickId);

  const { data: previewInfo } = usePreviewInfo(brickId);

  const showBrickPreview = record || previewInfo?.traceOptional;

  return (
    <DataTabPane eventKey={DataPanelTabKey.Output}>
      <ViewModeField name="viewMode" viewModeOptions={VIEW_MODE_OPTIONS} />

      {viewMode === OutputViewModes.Actual && <OutputActualBody />}
    </DataTabPane>
  );
};

export default OutputTab;
