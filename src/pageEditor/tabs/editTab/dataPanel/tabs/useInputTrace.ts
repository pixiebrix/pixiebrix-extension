import type { Nullishable } from "@/utils/nullishUtils";
import type { TraceRecord } from "@/telemetry/trace";
import { useSelector } from "react-redux";
import {
  selectActiveNodeId,
  selectActiveNodeInfo,
} from "@/pageEditor/store/editor/editorSelectors";
import { selectActiveModComponentTraces } from "@/pageEditor/store/runtime/runtimeSelectors";
import { useMemo } from "react";
import { isEqual } from "lodash";

function useInputTrace(): {
  isStale: boolean;
  traceRecord: Nullishable<TraceRecord>;
} {
  const activeNodeId = useSelector(selectActiveNodeId);
  const traces = useSelector(selectActiveModComponentTraces);
  const traceRecord = traces.find(
    (trace) => trace.brickInstanceId === activeNodeId,
  );

  const { index: brickIndex, pipeline } = useSelector(selectActiveNodeInfo);

  const isStale = useMemo(() => {
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

  return { isStale, traceRecord };
}

export default useInputTrace;
