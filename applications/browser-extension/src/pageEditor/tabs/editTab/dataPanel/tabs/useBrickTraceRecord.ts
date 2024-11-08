import type { Nullishable } from "../../../../../utils/nullishUtils";
import type { TraceRecord } from "../../../../../telemetry/trace";
import { useSelector } from "react-redux";
import {
  selectActiveNodeId,
  selectActiveNodeInfo,
} from "../../../../store/editor/editorSelectors";
import { selectActiveModComponentTraces } from "../../../../store/runtime/runtimeSelectors";
import { useMemo } from "react";
import { isEqual, omit } from "lodash";

function useBrickTraceRecord(): {
  /**
   * True if the variables/data passed to the brick might have changed since the last run. For example, if a
   * new brick was added in the pipeline.
   *
   * Used to warn if the preview might rely on outdated data.
   */
  isInputStale: boolean;
  /**
   * Return true if the trace might be outdated either because the input has changed or the brick configuration
   * has changed.
   */
  isStale: boolean;
  /**
   * The trace record for the active brick, or undefined if there's no matching trace record.
   */
  traceRecord: Nullishable<TraceRecord>;
} {
  const activeNodeId = useSelector(selectActiveNodeId);
  const traces = useSelector(selectActiveModComponentTraces);
  const traceRecord = traces.find(
    (trace) => trace.brickInstanceId === activeNodeId,
  );

  const {
    index: brickIndex,
    blockConfig: brickConfig,
    pipeline,
  } = useSelector(selectActiveNodeInfo);

  const isInputStale = useMemo(() => {
    // Don't show the warning if there are no traces. Also, this brick can't have a
    // stale input if it's the first brick in the pipeline.
    if (traceRecord === undefined || brickIndex === 0) {
      return false;
    }

    const currentInput = pipeline.slice(0, brickIndex);
    const tracedInput = currentInput.map(
      (brick) =>
        traces.find((trace) => trace.brickInstanceId === brick.instanceId)
          ?.brickConfig,
    );

    return !isEqual(currentInput, tracedInput);
  }, [brickIndex, pipeline, traceRecord, traces]);

  const isStale = useMemo(() => {
    if (isInputStale) {
      return true;
    }

    if (traceRecord === undefined) {
      return false;
    }

    return !isEqual(
      omit(traceRecord.brickConfig, "comments"),
      omit(brickConfig, "comments"),
    );
  }, [isInputStale, traceRecord, brickConfig]);

  return { isInputStale, isStale, traceRecord };
}

export default useBrickTraceRecord;
